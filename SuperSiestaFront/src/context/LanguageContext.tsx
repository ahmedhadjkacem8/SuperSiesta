import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { fr, translations, availableLanguages, type LangCode, type Translations } from "@/i18n";

interface LanguageContextType {
  lang: LangCode;
  t: Translations;
  setLang: (lang: LangCode) => void;
  toggleLang: () => void;
  availableLanguages: typeof availableLanguages;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: "fr",
  t: fr,
  setLang: () => {},
  toggleLang: () => {},
  availableLanguages,
  isRTL: false,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LangCode>(() => {
    const saved = localStorage.getItem("lang") as LangCode | null;
    if (saved && (saved === "fr" || saved === "ar" || saved === "en")) {
      return saved;
    }
    // Also support 'tn' migration from older pixel versions if stored
    if ((saved as string) === "tn") {
      return "ar";
    }
    return "fr";
  });

  const t = translations[lang] || fr;
  const isRTL = t.dir === "rtl";

  const setLang = (l: LangCode) => {
    setLangState(l);
    localStorage.setItem("lang", l);
  };

  const toggleLang = () => {
    if (lang === "fr") setLang("ar");
    else if (lang === "ar") setLang("en");
    else setLang("fr");
  };

  useEffect(() => {
    document.documentElement.dir = t.dir;
    document.documentElement.lang = lang === "ar" ? "ar-TN" : lang;
    if (t.dir === "rtl") {
      document.documentElement.classList.add("rtl");
      document.body.classList.add("rtl");
    } else {
      document.documentElement.classList.remove("rtl");
      document.body.classList.remove("rtl");
    }
  }, [lang, t.dir]);

  return (
    <LanguageContext.Provider value={{ lang, t, setLang, toggleLang, availableLanguages, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
}

/**
 * AdminLanguageProvider — Force toujours le français (LTR) pour le panneau d'administration.
 * Le choix de langue du client n'affecte pas l'admin.
 */
export function AdminLanguageProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Forcer LTR et français sur le document quand l'admin est actif
    document.documentElement.dir = "ltr";
    document.documentElement.lang = "fr";
    document.documentElement.classList.remove("rtl");
    document.body.classList.remove("rtl");

    // Restaurer la langue cliente à la sortie de l'admin
    return () => {
      const savedLang = localStorage.getItem("lang") as LangCode | null;
      const lang = (savedLang && ["fr", "ar", "en"].includes(savedLang)) ? savedLang : "fr";
      const t = translations[lang] || fr;
      document.documentElement.dir = t.dir;
      document.documentElement.lang = lang === "ar" ? "ar-TN" : lang;
      if (t.dir === "rtl") {
        document.documentElement.classList.add("rtl");
        document.body.classList.add("rtl");
      }
    };
  }, []);

  return (
    <LanguageContext.Provider value={{
      lang: "fr",
      t: fr,
      setLang: () => {},
      toggleLang: () => {},
      availableLanguages,
      isRTL: false,
    }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
