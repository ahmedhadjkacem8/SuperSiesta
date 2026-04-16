import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number | string | null | undefined) {
  if (price === null || price === undefined) return "";
  const p = typeof price === "string" ? parseFloat(price) : price;
  if (isNaN(p)) return "0.000 DT";
  return p.toLocaleString("fr-FR", { minimumFractionDigits: 3, maximumFractionDigits: 3 }) + " DT";
}
