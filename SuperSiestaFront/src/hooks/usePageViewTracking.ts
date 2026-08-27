import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { trackPageView, generateEventId, getFbpCookie, getFbcCookie } from "@/services/metaPixel";
import { api } from "@/lib/apiClient";

/**
 * Hook to automatically track PageView events on SPA route changes.
 *
 * On each navigation:
 *  1. Generates a shared UUIDv4 event_id
 *  2. Fires window.fbq('track', 'PageView', {}, { eventID }) — browser Pixel
 *  3. POSTs to /api/meta/event — Laravel relays it to Meta CAPI (server-side mirror)
 *
 * Both sides carry the same event_id → Meta deduplicates automatically (counts only once).
 *
 * Ignores administration routes (/admin/*).
 * Prevents duplicate calls on re-renders for the same URL.
 */
export function usePageViewTracking() {
  const location = useLocation();
  const lastTrackedPath = useRef<string | null>(null);

  useEffect(() => {
    const currentPath = location.pathname + location.search;

    // Do not track admin panel routes
    if (location.pathname.startsWith("/admin")) {
      return;
    }

    // Prevent duplicate PageView events for the same URL
    if (lastTrackedPath.current === currentPath) {
      return;
    }

    lastTrackedPath.current = currentPath;

    // 1. Generate a shared event_id for Pixel + CAPI deduplication
    const eventId = generateEventId();

    // 2. Fire browser-side Pixel event
    trackPageView(eventId);

    // 3. Mirror to CAPI server-side (fire-and-forget — never block navigation)
    api
      .post("/meta/event", {
        event_name: "PageView",
        event_id: eventId,
        event_source_url: window.location.href,
        fbp: getFbpCookie(),
        fbc: getFbcCookie(),
      })
      .catch(() => {
        // Silently ignore CAPI relay errors — Pixel already fired successfully
      });
  }, [location.pathname, location.search]);
}
