import { useState, useEffect } from 'react';
import { api } from '@/lib/apiClient';

export interface SiteSettings {
  contact_phone: string;
  contact_email: string;
  contact_address: string;
  contact_facebook: string;
  contact_instagram: string;
  contact_whatsapp: string;
  contact_hours: string;
  top_banner_text: string;
  footer_description: string;
  [key: string]: string;
}

const defaultSettings: SiteSettings = {
  contact_phone: "+216 71 000 000",
  contact_email: "contact@supersiesta.tn",
  contact_address: "Tunis, Tunisie",
  contact_facebook: "#",
  contact_instagram: "#",
  contact_whatsapp: "https://wa.me/21671000000",
  contact_hours: "Lun-Sam 9h-19h",
  top_banner_text: "🚚 Livraison gratuite partout en Tunisie | 📞 71 000 000 | Paiement à la livraison",
  footer_description: "Matelas N°1 en Tunisie depuis 1993. Qualité, confort et hygiène pour votre sommeil.",
};

// Simple singleton to cache settings between components
let cachedSettings: SiteSettings | null = null;
let listeners: Array<(settings: SiteSettings) => void> = [];

export function useSettings() {
  const [settings, setSettings] = useState<SiteSettings>(cachedSettings || defaultSettings);
  const [loading, setLoading] = useState(!cachedSettings);

  useEffect(() => {
    const handleChange = (newSettings: SiteSettings) => {
      setSettings(newSettings);
    };

    listeners.push(handleChange);

    if (!cachedSettings) {
      api.get<any>("/settings")
        .then((data) => {
          if (data) {
            const merged = { ...defaultSettings, ...data };
            cachedSettings = merged;
            listeners.forEach(l => l(merged));
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }

    return () => {
      listeners = listeners.filter(l => l !== handleChange);
    };
  }, []);

  return { settings, loading };
}
