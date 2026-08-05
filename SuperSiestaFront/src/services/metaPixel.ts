/**
 * Meta Pixel Centralized Service (Client-Side Tracking)
 * 
 * Configured strictly for Super Siesta with currency TND (Tunisian Dinar).
 * Handles PII normalization + SHA-256 hashing for Advanced Matching,
 * event_id generation for Meta Pixel & CAPI deduplication,
 * and standard e-commerce event payload structuring.
 */

declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
    _fbq?: any;
  }
}

export const META_PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID || "1012351344935449";
export const META_CURRENCY = "TND"; // Fixed currency for Super Siesta

const isDebug = import.meta.env.VITE_META_PIXEL_DEBUG === "true";

function logDebug(eventName: string, data?: any, eventId?: string) {
  if (isDebug) {
    console.log(`[MetaPixel Debug] Event: ${eventName}`, {
      eventId,
      currency: META_CURRENCY,
      data,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Generate a unique UUIDv4 event_id shared between Meta Pixel (Client) and CAPI (Server) for deduplication.
 */
export function generateEventId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return 'event-' + Date.now() + '-' + Math.random().toString(36).substring(2, 11);
}

/**
 * SHA-256 hashing using Web Crypto API
 */
export async function sha256(value: string): Promise<string> {
  if (!value) return "";
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(value);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return "";
  }
}

/**
 * Normalize Email according to Meta specifications:
 * - Remove leading/trailing whitespace
 * - Convert to lowercase
 */
export function normalizeEmail(email: string): string {
  if (!email) return "";
  return email.trim().toLowerCase();
}

/**
 * Normalize Phone Number according to Meta E.164 specifications:
 * - Remove spaces, dashes, parentheses, plus signs
 * - Ensure non-empty digit string
 */
export function normalizePhone(phone: string): string {
  if (!phone) return "";
  let digits = phone.replace(/\D/g, "");
  if (!digits) return "";

  if (digits.startsWith("00")) {
    digits = digits.substring(2);
  }

  if (digits.length === 8) {
    return `216${digits}`;
  }

  if (digits.length === 9 && digits.startsWith("0")) {
    return `216${digits.substring(1)}`;
  }

  return digits;
}

/**
 * Normalize Name (First/Last):
 * - Trim whitespace and convert to lowercase
 */
export function normalizeName(name: string): string {
  if (!name) return "";
  return name.trim().toLowerCase().replace(/[^\w\s]/gi, "");
}

/**
 * Get _fbp cookie value for CAPI context
 */
export function getFbpCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|; )\s*_fbp\s*=\s*([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Get _fbc cookie value for CAPI context
 */
export function getFbcCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|; )\s*_fbc\s*=\s*([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Initialize Advanced Matching on Pixel init with SHA-256 hashed user data
 */
export async function initAdvancedMatching(user: {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
}) {
  if (typeof window === "undefined" || !window.fbq) return;

  const advancedMatching: Record<string, string> = {};

  if (user.email) {
    const norm = normalizeEmail(user.email);
    if (norm) advancedMatching.em = await sha256(norm);
  }
  if (user.phone) {
    const norm = normalizePhone(user.phone);
    if (norm) advancedMatching.ph = await sha256(norm);
  }
  if (user.firstName) {
    const norm = normalizeName(user.firstName);
    if (norm) advancedMatching.fn = await sha256(norm);
  }
  if (user.lastName) {
    const norm = normalizeName(user.lastName);
    if (norm) advancedMatching.ln = await sha256(norm);
  }

  window.fbq("init", META_PIXEL_ID, advancedMatching);
  logDebug("fbq('init') with Advanced Matching", advancedMatching);
}

/**
 * Track PageView
 */
export function trackPageView(eventId?: string): string {
  const eid = eventId || generateEventId();
  if (typeof window !== "undefined" && window.fbq) {
    window.fbq("track", "PageView", {}, { eventID: eid });
    logDebug("PageView", {}, eid);
  }
  return eid;
}

/**
 * Track ViewContent (Product Details Page)
 */
export function trackViewContent(
  product: {
    id: string | number;
    name: string;
    price: number;
    category?: string;
  },
  eventId?: string
): string {
  const eid = eventId || generateEventId();
  const payload = {
    content_ids: [String(product.id)],
    content_name: product.name,
    content_type: "product",
    content_category: product.category || "Matelas",
    value: Number(product.price) || 0,
    currency: META_CURRENCY,
  };

  if (typeof window !== "undefined" && window.fbq) {
    window.fbq("track", "ViewContent", payload, { eventID: eid });
    logDebug("ViewContent", payload, eid);
  }
  return eid;
}

/**
 * Track AddToCart
 */
export function trackAddToCart(
  product: {
    id: string | number;
    name: string;
    price: number;
    quantity?: number;
  },
  eventId?: string
): string {
  const eid = eventId || generateEventId();
  const qty = product.quantity || 1;
  const payload = {
    content_ids: [String(product.id)],
    content_name: product.name,
    content_type: "product",
    value: (Number(product.price) || 0) * qty,
    currency: META_CURRENCY,
    num_items: qty,
  };

  if (typeof window !== "undefined" && window.fbq) {
    window.fbq("track", "AddToCart", payload, { eventID: eid });
    logDebug("AddToCart", payload, eid);
  }
  return eid;
}

/**
 * Track InitiateCheckout
 */
export function trackInitiateCheckout(
  items: Array<{
    id: string | number;
    name: string;
    price: number;
    quantity: number;
  }>,
  totalValue: number,
  eventId?: string
): string {
  const eid = eventId || generateEventId();
  const payload = {
    content_ids: items.map((item) => String(item.id)),
    content_type: "product",
    value: Number(totalValue) || 0,
    currency: META_CURRENCY,
    num_items: items.reduce((sum, item) => sum + item.quantity, 0),
  };

  if (typeof window !== "undefined" && window.fbq) {
    window.fbq("track", "InitiateCheckout", payload, { eventID: eid });
    logDebug("InitiateCheckout", payload, eid);
  }
  return eid;
}

/**
 * Track Purchase (Client-Side)
 */
export function trackPurchase(
  order: {
    orderId: string | number;
    value: number;
    items: Array<{
      id: string | number;
      name: string;
      price: number;
      quantity: number;
    }>;
  },
  eventId?: string
): string {
  const eid = eventId || generateEventId();
  const payload = {
    content_ids: order.items.map((item) => String(item.id)),
    content_type: "product",
    value: Number(order.value) || 0,
    currency: META_CURRENCY,
    num_items: order.items.reduce((sum, item) => sum + item.quantity, 0),
    order_id: String(order.orderId),
  };

  if (typeof window !== "undefined" && window.fbq) {
    window.fbq("track", "Purchase", payload, { eventID: eid });
    logDebug("Purchase", payload, eid);
  }
  return eid;
}

/**
 * Track Search
 */
export function trackSearch(searchQuery: string, eventId?: string): string {
  const eid = eventId || generateEventId();
  if (!searchQuery || !searchQuery.trim()) return eid;

  const payload = {
    search_string: searchQuery.trim(),
    currency: META_CURRENCY,
  };

  if (typeof window !== "undefined" && window.fbq) {
    window.fbq("track", "Search", payload, { eventID: eid });
    logDebug("Search", payload, eid);
  }
  return eid;
}

/**
 * Track Lead (Contact form submission)
 */
export function trackLead(formType = "Contact Form", eventId?: string): string {
  const eid = eventId || generateEventId();
  const payload = {
    content_name: formType,
    currency: META_CURRENCY,
  };

  if (typeof window !== "undefined" && window.fbq) {
    window.fbq("track", "Lead", payload, { eventID: eid });
    logDebug("Lead", payload, eid);
  }
  return eid;
}
