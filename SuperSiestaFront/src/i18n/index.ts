import { fr } from "./fr";
import { ar } from "./ar";
import { en } from "./en";

export type LangCode = "fr" | "ar" | "en";
export type Translations = typeof fr;

export const translations: Record<LangCode, Translations> = {
  fr,
  ar: ar as unknown as Translations,
  en: en as unknown as Translations,
};

export const availableLanguages: { code: LangCode; label: string; shortLabel: string; flag: string; dir: "ltr" | "rtl" }[] = [
  { code: "fr", label: "Français", shortLabel: "FR", flag: "🇫🇷", dir: "ltr" },
  { code: "ar", label: "العربية", shortLabel: "عربي", flag: "🇹🇳", dir: "rtl" },
  { code: "en", label: "English", shortLabel: "EN", flag: "🇬🇧", dir: "ltr" },
];

export { fr, ar, en };
