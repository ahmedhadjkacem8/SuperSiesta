import { useQuery } from '@tanstack/react-query';
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
  product_special_dimension_notice_fr?: string;
  product_special_dimension_notice_en?: string;
  product_special_dimension_notice_ar?: string;
  checkout_special_dimension_notice_fr?: string;
  checkout_special_dimension_notice_en?: string;
  checkout_special_dimension_notice_ar?: string;
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
  trust_badges: JSON.stringify([
    { icon: "Truck", title: "Livraison gratuite", sub: "Partout en Tunisie" },
    { icon: "CreditCard", title: "Paiement à la livraison", sub: "Sans frais cachés" },
    { icon: "ShieldCheck", title: "Garantie 10 ans", sub: "Sur tous nos matelas" },
    { icon: "Clock", title: "Service client 24/7", sub: "+216 71 000 000" },
  ]),
};

export function useSettings() {
  const query = useQuery({
    queryKey: ['site-settings'],
    queryFn: async () => {
      try {
        const data = await api.get<Partial<SiteSettings>>("/settings");
        return { ...defaultSettings, ...data };
      } catch (error) {
        console.error('Error fetching site settings:', error);
        throw error;
      }
    },
    staleTime: 1000 * 60 * 5,
    retry: false,
    refetchOnWindowFocus: false,
  });

  return { settings: query.data || defaultSettings, loading: query.isLoading };
}
