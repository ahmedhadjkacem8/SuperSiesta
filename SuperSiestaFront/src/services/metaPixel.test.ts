import { beforeEach, describe, expect, it, vi } from "vitest";
import { getFbcCookie, trackAddToCart, trackViewContent } from "./metaPixel";

describe("Meta event tracking", () => {
  beforeEach(() => {
    document.cookie = "_fbc=; Max-Age=0; path=/";
    sessionStorage.clear();
    window.history.replaceState({}, "", "/?fbclid=click-id-123");
    window.fbq = vi.fn();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
  });

  it("builds and retains an fbc value from fbclid when the _fbc cookie is missing", () => {
    expect(getFbcCookie()).toMatch(/^fb\.1\.\d+\.click-id-123$/);

    window.history.replaceState({}, "", "/product");

    expect(getFbcCookie()).toMatch(/^fb\.1\.\d+\.click-id-123$/);
  });

  it("includes the Facebook click ID in the server-side ViewContent event", () => {
    trackViewContent({ id: "product-1", name: "Mattress", price: 120 });

    const [, request] = vi.mocked(fetch).mock.calls[0];
    const payload = JSON.parse(request?.body as string);
    expect(payload.fbc).toMatch(/^fb\.1\.\d+\.click-id-123$/);
  });

  it("sends AddToCart with TND to both Pixel and Conversions API", () => {
    trackAddToCart(
      { id: "product-1", name: "Mattress", price: 120, quantity: 2 },
      "event-add-to-cart",
      { fbc: "fb.1.1600000000000.click-id-123" },
    );

    expect(window.fbq).toHaveBeenCalledWith(
      "track",
      "AddToCart",
      expect.objectContaining({ currency: "TND", value: 240 }),
      { eventID: "event-add-to-cart" },
    );

    const [, request] = vi.mocked(fetch).mock.calls[0];
    const payload = JSON.parse(request?.body as string);
    expect(payload.fbc).toMatch(/^fb\.1\.\d+\.click-id-123$/);
    expect(payload.custom_data).toEqual(
      expect.objectContaining({ currency: "TND", value: 240 }),
    );
  });
});
