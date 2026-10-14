/**
 * Google Tag Manager (GTM) & GA4 / Google Ads dataLayer Centralized Service
 *
 * Configured strictly for Super Siesta with currency TND (Tunisian Dinar).
 * 
 * Architecture:
 * - GTM-only dataLayer architecture: React code only pushes structured events to window.dataLayer.
 * - All tags (GA4, Google Ads, Remarketing, Conversion Linker) are managed in GTM.
 * - Standard GA4 e-commerce payload structure with prior `push({ ecommerce: null })` reset.
 * - Enhanced Conversions support: user_data (email, phone_number in E.164).
 * - Safe execution with try/catch to ensure zero impact on user experience.
 */

declare global {
  interface Window {
    dataLayer?: Array<Record<string, any>>;
  }
}

export const GA_CURRENCY = "TND";

export interface GAItem {
  item_id: string;
  item_name: string;
  item_category?: string;
  price: number;
  quantity?: number;
}

export interface GAUserData {
  email?: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  city?: string;
}

/**
 * Format Tunisian/international phone numbers into clean E.164 (+216XXXXXXXX)
 */
export function formatE164Phone(phone?: string | null): string {
  if (!phone) return "";
  let digits = phone.replace(/\D/g, "");
  if (!digits) return "";

  if (digits.startsWith("00")) {
    digits = digits.substring(2);
  }

  // 8-digit Tunisian local number (e.g. 20123456)
  if (digits.length === 8) {
    return `+216${digits}`;
  }

  // 9-digit with leading 0 (e.g. 020123456)
  if (digits.length === 9 && digits.startsWith("0")) {
    return `+216${digits.substring(1)}`;
  }

  // Already prefixed with 216
  if (digits.startsWith("216") && digits.length === 11) {
    return `+${digits}`;
  }

  return digits.startsWith("+") ? digits : `+${digits}`;
}

/**
 * Push data securely to window.dataLayer
 */
export function pushToDataLayer(data: Record<string, any>): void {
  if (typeof window === "undefined") return;

  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(data);
  } catch {
    // Tracking must not interrupt the customer flow.
  }
}

/**
 * View Item (Fiche Produit)
 */
export function trackGAViewItem(product: {
  id: string | number;
  name: string;
  price: number;
  category?: string;
}): void {
  const item: GAItem = {
    item_id: String(product.id),
    item_name: product.name,
    item_category: product.category || "Matelas",
    price: Number(product.price) || 0,
    quantity: 1,
  };

  pushToDataLayer({ ecommerce: null }); // Clear previous ecommerce object
  pushToDataLayer({
    event: "view_item",
    ecommerce: {
      currency: GA_CURRENCY,
      value: Number(product.price) || 0,
      items: [item],
    },
  });
}

/**
 * Add To Cart
 */
export function trackGAAddToCart(product: {
  id: string | number;
  name: string;
  price?: number | string | null;
  quantity?: number;
  category?: string;
}): void {
  const price =
    typeof product.price === "number"
      ? product.price
      : typeof product.price === "string" && product.price.trim() !== ""
        ? Number(product.price)
        : Number.NaN;
  const qty = product.quantity === undefined ? 1 : product.quantity;
  const value = price * qty;

  if (
    !Number.isFinite(price) ||
    price <= 0 ||
    !Number.isSafeInteger(qty) ||
    qty <= 0 ||
    !Number.isFinite(value)
  ) {
    if (import.meta.env.DEV) {
      console.warn("[GTM] add_to_cart skipped: invalid price or quantity.", {
        price: product.price,
        quantity: product.quantity,
      });
    }
    return;
  }

  const item: GAItem = {
    item_id: String(product.id),
    item_name: product.name,
    item_category: product.category || "Matelas",
    price,
    quantity: qty,
  };

  pushToDataLayer({ ecommerce: null });
  pushToDataLayer({
    event: "add_to_cart",
    ecommerce: {
      currency: GA_CURRENCY,
      value,
      items: [item],
    },
  });
}

/**
 * Begin Checkout (Initiate Checkout)
 */
export function trackGABeginCheckout(
  items: Array<{
    id: string | number;
    name: string;
    price: number;
    quantity: number;
    category?: string;
  }>,
  totalValue: number
): void {
  const gaItems: GAItem[] = items.map((i) => ({
    item_id: String(i.id),
    item_name: i.name,
    item_category: i.category || "Matelas",
    price: Number(i.price) || 0,
    quantity: Number(i.quantity) || 1,
  }));

  pushToDataLayer({ ecommerce: null });
  pushToDataLayer({
    event: "begin_checkout",
    ecommerce: {
      currency: GA_CURRENCY,
      value: Number(totalValue) || 0,
      items: gaItems,
    },
  });
}

/**
 * Purchase (Confirmation de Commande)
 * Includes user_data for Google Ads Enhanced Conversions
 */
export function trackGAPurchase(
  orderId: string | number,
  value: number,
  items: Array<{
    id: string | number;
    name: string;
    price: number;
    quantity: number;
    category?: string;
  }>,
  user?: GAUserData
): void {
  const gaItems: GAItem[] = items.map((i) => ({
    item_id: String(i.id),
    item_name: i.name,
    item_category: i.category || "Matelas",
    price: Number(i.price) || 0,
    quantity: Number(i.quantity) || 1,
  }));

  // Build clean user_data for Enhanced Conversions
  const userData: Record<string, string> = {};
  if (user?.email) {
    const cleanEmail = user.email.trim().toLowerCase();
    if (cleanEmail) userData.email = cleanEmail;
  }
  if (user?.phone) {
    const e164 = formatE164Phone(user.phone);
    if (e164) userData.phone_number = e164;
  }
  if (user?.city) {
    userData.address = JSON.stringify({ city: user.city });
  }

  pushToDataLayer({ ecommerce: null });
  pushToDataLayer({
    event: "purchase",
    ecommerce: {
      transaction_id: String(orderId),
      value: Number(value) || 0,
      currency: GA_CURRENCY,
      items: gaItems,
    },
    ...(Object.keys(userData).length > 0 ? { user_data: userData } : {}),
  });
}

/**
 * Search Event
 */
export function trackGASearch(searchTerm: string): void {
  if (!searchTerm || !searchTerm.trim()) return;

  pushToDataLayer({
    event: "search",
    search_term: searchTerm.trim(),
  });
}

/**
 * Lead Event (Contact Form / Quote)
 */
export function trackGALead(formType = "Contact Form", user?: GAUserData): void {
  const userData: Record<string, string> = {};
  if (user?.email) userData.email = user.email.trim().toLowerCase();
  if (user?.phone) userData.phone_number = formatE164Phone(user.phone);

  pushToDataLayer({
    event: "generate_lead",
    lead_type: formType,
    currency: GA_CURRENCY,
    ...(Object.keys(userData).length > 0 ? { user_data: userData } : {}),
  });
}

/**
 * Newsletter / Sign-up Subscription
 */
export function trackGASubscribe(method = "newsletter", email?: string): void {
  pushToDataLayer({
    event: "sign_up",
    method,
    ...(email ? { user_data: { email: email.trim().toLowerCase() } } : {}),
  });
}

/**
 * SPA Route Change PageView
 */
export function trackGAPageView(pagePath: string, pageTitle?: string): void {
  pushToDataLayer({
    event: "page_view_spa",
    page_path: pagePath,
    page_title: pageTitle || (typeof document !== "undefined" ? document.title : undefined),
    page_location: typeof window !== "undefined" ? window.location.href : undefined,
  });
}

/**
 * Contact Click (Phone / WhatsApp)
 */
export function trackGAContactClick(type: "call" | "whatsapp", targetValue?: string): void {
  pushToDataLayer({
    event: type === "call" ? "click_call" : "click_whatsapp",
    contact_type: type,
    target_value: targetValue || "",
  });
}
