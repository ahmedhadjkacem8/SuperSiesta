/**
 * Meta Pixel & Conversions API (CAPI) Centralized Service
 * 
 * Configured strictly for Super Siesta with currency TND (Tunisian Dinar).
 * 
 * Features:
 * - Shared UUIDv4 event_id generation for 100% Meta Pixel & CAPI deduplication
 * - Simultaneous dual-dispatch: Browser Pixel (window.fbq) + Laravel CAPI relay (/api/meta/event)
 * - PII normalization + SHA-256 hashing for Advanced Matching & high Event Match Quality (EMQ)
 * - Automatic extraction of _fbp and _fbc cookies
 * - Resilient fire-and-forget CAPI requests to ensure zero impact on user experience
 */

declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
    _fbq?: any;
  }
}

export const META_PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID || "1012351344935449";
export const META_CURRENCY = "TND"; // Fixed currency for Super Siesta

const API_BASE_URL = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");
const isDebug = import.meta.env.VITE_META_PIXEL_DEBUG === "true" || import.meta.env.DEV;

export interface MetaUserData {
  email?: string;
  phone?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  city?: string;
  country?: string;
  [key: string]: any;
}

function logDebug(eventName: string, data?: any, eventId?: string) {
  if (isDebug) {
    console.log(`[Meta Hybrid Tracking] [${eventName}]`, {
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
  return "event-" + Date.now() + "-" + Math.random().toString(36).substring(2, 11);
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
 * - Ensure non-empty digit string with Tunisian +216 prefix default
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
 * Asynchronously relays an event to Laravel backend for Server-Side CAPI tracking.
 * Executed as fire-and-forget with native fetch to guarantee zero UI interruption.
 */
export async function sendCapiEvent(
  eventName: string,
  customData: Record<string, any> = {},
  eventId?: string,
  userData?: MetaUserData
): Promise<void> {
  const eid = eventId || generateEventId();
  try {
    const payload = {
      event_name: eventName,
      event_id: eid,
      event_source_url: typeof window !== "undefined" ? window.location.href : undefined,
      fbp: getFbpCookie(),
      fbc: getFbcCookie(),
      custom_data: {
        ...customData,
        currency: customData.currency || META_CURRENCY,
      },
      user_data: userData || {},
    };

    fetch(`${API_BASE_URL}/meta/event`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    }).catch((err) => {
      if (isDebug) {
        console.warn(`[Meta CAPI Relay] Error on ${eventName}:`, err);
      }
    });
  } catch (err) {
    if (isDebug) {
      console.warn(`[Meta CAPI Relay] Unexpected error dispatching ${eventName}:`, err);
    }
  }
}

/**
 * Track PageView (Dual: Pixel + CAPI)
 */
export function trackPageView(eventId?: string, userData?: MetaUserData): string {
  const eid = eventId || generateEventId();
  if (typeof window !== "undefined" && window.fbq) {
    window.fbq("track", "PageView", {}, { eventID: eid });
    logDebug("PageView", {}, eid);
  }
  sendCapiEvent("PageView", {}, eid, userData);
  return eid;
}

/**
 * Track ViewContent (Dual: Pixel + CAPI)
 */
export function trackViewContent(
  product: {
    id: string | number;
    name: string;
    price: number;
    category?: string;
  },
  eventId?: string,
  userData?: MetaUserData
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
  sendCapiEvent("ViewContent", payload, eid, userData);
  return eid;
}

/**
 * Track AddToCart (Dual: Pixel + CAPI)
 */
export function trackAddToCart(
  product: {
    id: string | number;
    name: string;
    price: number;
    quantity?: number;
    category?: string;
  },
  eventId?: string,
  userData?: MetaUserData
): string {
  const eid = eventId || generateEventId();
  const qty = product.quantity || 1;
  const payload = {
    content_ids: [String(product.id)],
    content_name: product.name,
    content_type: "product",
    content_category: product.category || "Matelas",
    value: (Number(product.price) || 0) * qty,
    currency: META_CURRENCY,
    num_items: qty,
  };

  if (typeof window !== "undefined" && window.fbq) {
    window.fbq("track", "AddToCart", payload, { eventID: eid });
    logDebug("AddToCart", payload, eid);
  }
  sendCapiEvent("AddToCart", payload, eid, userData);
  return eid;
}

/**
 * Track InitiateCheckout (Dual: Pixel + CAPI)
 */
export function trackInitiateCheckout(
  items: Array<{
    id: string | number;
    name: string;
    price: number;
    quantity: number;
  }>,
  totalValue: number,
  eventId?: string,
  userData?: MetaUserData
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
  sendCapiEvent("InitiateCheckout", payload, eid, userData);
  return eid;
}

/**
 * Track Purchase (Client-Side Pixel)
 * Note: CAPI Purchase is dispatched directly via Laravel OrderController with full checkout PII.
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
 * Track Search (Dual: Pixel + CAPI)
 */
export function trackSearch(
  searchQuery: string,
  eventId?: string,
  userData?: MetaUserData
): string {
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
  sendCapiEvent("Search", payload, eid, userData);
  return eid;
}

/**
 * Track Lead (Dual: Pixel + CAPI)
 */
export function trackLead(
  formType = "Contact Form",
  eventId?: string,
  userData?: MetaUserData
): string {
  const eid = eventId || generateEventId();
  const payload = {
    content_name: formType,
    currency: META_CURRENCY,
  };

  if (typeof window !== "undefined" && window.fbq) {
    window.fbq("track", "Lead", payload, { eventID: eid });
    logDebug("Lead", payload, eid);
  }
  sendCapiEvent("Lead", payload, eid, userData);
  return eid;
}

/**
 * Track Subscribe (Dual: Pixel + CAPI)
 */
export function trackSubscribe(
  email?: string,
  eventId?: string,
  userData?: MetaUserData
): string {
  const eid = eventId || generateEventId();
  const payload: Record<string, any> = {
    content_name: "Newsletter",
    currency: META_CURRENCY,
  };

  const userPayload = {
    ...(userData || {}),
    ...(email ? { email } : {}),
  };

  if (typeof window !== "undefined" && window.fbq) {
    window.fbq("track", "Subscribe", payload, { eventID: eid });
    logDebug("Subscribe", payload, eid);
  }
  sendCapiEvent("Subscribe", payload, eid, userPayload);
  return eid;
}

/**
 * Track Custom Event (Dual: Pixel + CAPI)
 */
export function trackCustom(
  eventName: string,
  customData: Record<string, any> = {},
  eventId?: string,
  userData?: MetaUserData
): string {
  const eid = eventId || generateEventId();
  const payload = {
    ...customData,
    currency: customData.currency || META_CURRENCY,
  };

  if (typeof window !== "undefined" && window.fbq) {
    window.fbq("trackCustom", eventName, payload, { eventID: eid });
    logDebug(eventName, payload, eid);
  }
  sendCapiEvent(eventName, payload, eid, userData);
  return eid;
}
