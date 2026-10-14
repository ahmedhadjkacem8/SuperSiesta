import { beforeEach, describe, expect, it, vi } from "vitest";
import { trackGAAddToCart } from "./analytics";
import { getFbcCookie, trackAddToCart, trackViewContent } from "./metaPixel";

describe("Meta event tracking", () => {
  beforeEach(() => {
    document.cookie = "_fbc=; Max-Age=0; path=/";
    sessionStorage.clear();
    window.dataLayer = [];
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
    const pixelPayload = vi.mocked(window.fbq).mock.calls[0][2];
    expect(payload.custom_data).toEqual(pixelPayload);
    expect(typeof payload.custom_data.value).toBe("number");
    expect(payload.event_id).toBe("event-add-to-cart");
  });

  it.each([undefined, null, "", "not-a-price", 0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    "does not send AddToCart when the price is invalid (%s)",
    (price) => {
      const eventId = trackAddToCart({
        id: "product-1",
        name: "Mattress",
        price,
      });

      expect(eventId).toBe("");
      expect(window.fbq).not.toHaveBeenCalled();
      expect(fetch).not.toHaveBeenCalled();
    },
  );

  it("normalizes a numeric string price to a numeric event value", () => {
    trackAddToCart(
      { id: "product-1", name: "Mattress", price: "12.5", quantity: 2 },
      "event-numeric-string",
    );

    expect(window.fbq).toHaveBeenCalledWith(
      "track",
      "AddToCart",
      expect.objectContaining({ value: 25, currency: "TND" }),
      { eventID: "event-numeric-string" },
    );
  });

  it("pushes a numeric GA4 add_to_cart value and the default currency to GTM", () => {
    trackGAAddToCart({
      id: "product-1",
      name: "Mattress",
      price: "12.5",
      quantity: 2,
    });

    expect(window.dataLayer).toContainEqual({
      event: "add_to_cart",
      ecommerce: {
        currency: "TND",
        value: 25,
        items: [
          expect.objectContaining({
            item_id: "product-1",
            price: 12.5,
            quantity: 2,
          }),
        ],
      },
    });
    expect(typeof window.dataLayer?.[1].ecommerce.value).toBe("number");
  });

  it("does not push a GTM add_to_cart event for an invalid price", () => {
    trackGAAddToCart({
      id: "product-1",
      name: "Mattress",
      price: 0,
    });

    expect(window.dataLayer).toEqual([]);
  });
});
