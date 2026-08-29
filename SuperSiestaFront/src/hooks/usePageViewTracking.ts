import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { trackPageView } from "@/services/metaPixel";

/**
 * Hook to automatically track PageView events on SPA route changes.
 *
 * On each navigation:
 *  - Generates a shared UUIDv4 event_id
 *  - Fires window.fbq('track', 'PageView', {}, { eventID }) — browser Pixel
 *  - Relays to Laravel Meta CAPI (/api/meta/event) with matching event_id for deduplication
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

    // Track PageView dual-dispatch (Pixel + CAPI) with automatic deduplication
    trackPageView();
  }, [location.pathname, location.search]);
}
