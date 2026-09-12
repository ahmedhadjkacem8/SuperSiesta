import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number | string | null | undefined, customCurrency?: string) {
  if (price === null || price === undefined) return "";
  const p = typeof price === "string" ? parseFloat(price) : price;
  if (isNaN(p)) return "";
  if (p === 0) return "sur commande";
  
  let currency = customCurrency;
  if (!currency) {
    const isArabic = typeof window !== "undefined" && (
      localStorage.getItem("app_language") === "ar" ||
      document.documentElement.lang === "ar" ||
      document.documentElement.getAttribute("dir") === "rtl"
    );
    currency = isArabic ? "د.ت" : "DT";
  }
  
  return `${p.toLocaleString("fr-FR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} ${currency}`;
}
