/**
 * Google Ads Click ID (gclid, gbraid, wbraid) Attribution Service
 *
 * Captures Google Ads click identifiers from URL query parameters,
 * persists them in localStorage with a 90-day expiration window,
 * and attaches them to incoming orders for Offline Conversion Tracking.
 */

const STORAGE_KEY = "supersiesta_ads_attribution";
const ATTRIBUTION_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days
const META_STORAGE_KEY = "supersiesta_meta_attribution";
const API_BASE_URL = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");

export interface AdsAttributionData {
  gclid?: string | null;
  gbraid?: string | null;
  wbraid?: string | null;
  captured_at: number; // timestamp in ms
}

interface MetaAttributionData {
  fbclid: string;
  captured_at: number;
}

/**
 * Capture Google Ads Click IDs from the current URL if present.
 * Should be called on application initialization / route changes.
 */
export function initAdsAttribution(): void {
  if (typeof window === "undefined") return;

  try {
    const urlParams = new URLSearchParams(window.location.search);
    const fbclid = urlParams.get("fbclid");
    const gclid = urlParams.get("gclid");
    const gbraid = urlParams.get("gbraid");
    const wbraid = urlParams.get("wbraid");

    if (fbclid) {
      const existingMeta = getStoredMetaAttribution();
      if (existingMeta?.fbclid !== fbclid) {
        localStorage.setItem(META_STORAGE_KEY, JSON.stringify({
          fbclid,
          captured_at: Date.now(),
        }));
      }
    }

    if (gclid || gbraid || wbraid) {
      const existing = getStoredAttribution();

      const updated: AdsAttributionData = {
        gclid: gclid || existing?.gclid || null,
        gbraid: gbraid || existing?.gbraid || null,
        wbraid: wbraid || existing?.wbraid || null,
        captured_at: Date.now(),
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }

    void syncMetaAttribution();
  } catch (err) {
    // Storage access may fail in private browsing mode; fail gracefully
  }
}

function getStoredMetaAttribution(): MetaAttributionData | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(META_STORAGE_KEY);
    if (!raw) return null;

    const data = JSON.parse(raw) as MetaAttributionData;
    if (!data.fbclid || !data.captured_at || Date.now() - data.captured_at > ATTRIBUTION_TTL_MS) {
      localStorage.removeItem(META_STORAGE_KEY);
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

/**
 * Persists a captured Meta click in the Laravel session before checkout.
 */
export async function syncMetaAttribution(): Promise<boolean> {
  const attribution = getStoredMetaAttribution();
  if (!attribution || typeof window === "undefined") return false;

  try {
    const fbp = document.cookie.match(/(?:^|; )\s*_fbp\s*=\s*([^;]*)/)?.[1];
    const response = await fetch(`${API_BASE_URL}/meta/attribution`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        fbclid: attribution.fbclid,
        fbp: fbp ? decodeURIComponent(fbp) : null,
      }),
    });

    if (!response.ok) {
      console.warn("Meta click attribution could not be saved to the Laravel session.", response.status);
      return false;
    }

    return true;
  } catch (error) {
    console.warn("Meta click attribution could not be saved to the Laravel session.", error);
    return false;
  }
}

/**
 * Get internal stored attribution payload, validating 90-day TTL.
 */
function getStoredAttribution(): AdsAttributionData | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const data: AdsAttributionData = JSON.parse(raw);
    if (!data || !data.captured_at) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    const isExpired = Date.now() - data.captured_at > ATTRIBUTION_TTL_MS;
    if (isExpired) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

/**
 * Get valid Google Ads Click IDs formatted for API order payload.
 */
export function getAdsClickIds(): {
  gclid: string | null;
  gbraid: string | null;
  wbraid: string | null;
  ads_click_captured_at: string | null;
} {
  const data = getStoredAttribution();

  if (!data) {
    return {
      gclid: null,
      gbraid: null,
      wbraid: null,
      ads_click_captured_at: null,
    };
  }

  return {
    gclid: data.gclid || null,
    gbraid: data.gbraid || null,
    wbraid: data.wbraid || null,
    ads_click_captured_at: data.captured_at ? new Date(data.captured_at).toISOString() : null,
  };
}
