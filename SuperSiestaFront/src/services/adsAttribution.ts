/**
 * Google Ads Click ID (gclid, gbraid, wbraid) Attribution Service
 *
 * Captures Google Ads click identifiers from URL query parameters,
 * persists them in localStorage with a 90-day expiration window,
 * and attaches them to incoming orders for Offline Conversion Tracking.
 */

const STORAGE_KEY = "supersiesta_ads_attribution";
const ATTRIBUTION_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

export interface AdsAttributionData {
  gclid?: string | null;
  gbraid?: string | null;
  wbraid?: string | null;
  captured_at: number; // timestamp in ms
}

/**
 * Capture Google Ads Click IDs from the current URL if present.
 * Should be called on application initialization / route changes.
 */
export function initAdsAttribution(): void {
  if (typeof window === "undefined") return;

  try {
    const urlParams = new URLSearchParams(window.location.search);
    const gclid = urlParams.get("gclid");
    const gbraid = urlParams.get("gbraid");
    const wbraid = urlParams.get("wbraid");

    if (!gclid && !gbraid && !wbraid) {
      return; // Nothing to capture, do not overwrite existing stored attribution
    }

    const existing = getStoredAttribution();

    const updated: AdsAttributionData = {
      gclid: gclid || existing?.gclid || null,
      gbraid: gbraid || existing?.gbraid || null,
      wbraid: wbraid || existing?.wbraid || null,
      captured_at: Date.now(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    // Storage access may fail in private browsing mode; fail gracefully
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
