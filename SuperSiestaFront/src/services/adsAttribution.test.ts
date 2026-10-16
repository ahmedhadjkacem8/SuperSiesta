import { beforeEach, describe, expect, it, vi } from "vitest";
import { initAdsAttribution, syncMetaAttribution } from "./adsAttribution";

describe("Meta Ads attribution", () => {
  beforeEach(() => {
    localStorage.clear();
    document.cookie = "_fbp=fb.1.1700000000000.browser-id; path=/";
    window.history.replaceState({}, "", "/?fbclid=meta-click-123");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
  });

  it("captures fbclid locally and synchronizes it to a credentialed Laravel session", async () => {
    initAdsAttribution();
    await vi.waitFor(() => expect(fetch).toHaveBeenCalled());

    const stored = JSON.parse(localStorage.getItem("supersiesta_meta_attribution") || "{}");
    expect(stored.fbclid).toBe("meta-click-123");

    const [url, request] = vi.mocked(fetch).mock.calls[0];
    expect(url).toContain("/meta/attribution");
    expect(request?.credentials).toBe("include");
    expect(JSON.parse(request?.body as string)).toEqual({
      fbclid: "meta-click-123",
      fbp: "fb.1.1700000000000.browser-id",
    });
  });

  it("does not claim or sync Meta attribution without a stored click ID", async () => {
    window.history.replaceState({}, "", "/");

    await expect(syncMetaAttribution()).resolves.toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });
});
