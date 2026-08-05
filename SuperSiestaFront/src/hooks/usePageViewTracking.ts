import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { trackPageView } from "@/services/metaPixel";

/**
 * Hook to automatically track PageView events on SPA route changes.
 * Avoids duplicate calls on initial mount / re-renders.
 * Ignores administration routes (/admin/*).
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
    trackPageView();
  }, [location.pathname, location.search]);
}
