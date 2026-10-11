import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { trackPageView } from "@/services/metaPixel";
import { trackGAPageView } from "@/services/analytics";
import { initAdsAttribution } from "@/services/adsAttribution";

/**
 * Hook to automatically track PageView events on SPA route changes.
 *
 * On each navigation:
 *  - Generates a shared UUIDv4 event_id
 *  - Fires window.fbq('track', 'PageView', {}, { eventID }) — browser Pixel
 *  - Relays to Laravel Meta CAPI (/api/meta/event) with matching event_id for deduplication
 *  - Pushes 'page_view_spa' to Google Tag Manager dataLayer
 *  - Captures Google Ads click identifiers (gclid/gbraid/wbraid) if present in URL
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

    // Always check for incoming ads attribution parameters on URL changes
    initAdsAttribution();

    // Prevent duplicate PageView events for the same URL
    if (lastTrackedPath.current === currentPath) {
      return;
    }

    lastTrackedPath.current = currentPath;

    // Track Meta PageView dual-dispatch (Pixel + CAPI) with automatic deduplication
    trackPageView();

    // Track Google Tag Manager / GA4 SPA PageView
    trackGAPageView(currentPath);
  }, [location.pathname, location.search]);
}
