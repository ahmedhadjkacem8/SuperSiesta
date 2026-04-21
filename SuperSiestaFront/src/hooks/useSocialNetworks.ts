import { useState, useEffect } from 'react';
import { api } from '@/lib/apiClient';

export interface SocialNetwork {
  id: number;
  name: string;
  url: string;
  icon_id: number;
  is_active: boolean;
  icon: {
    id: number;
    name: string;
    lucide_name: string;
    hex_color?: string;
  };
}

export interface Icon {
  id: number;
  name: string;
  lucide_name: string;
  hex_color?: string;
}

export function useSocialNetworks() {
  const [socials, setSocials] = useState<SocialNetwork[]>([]);
  const [icons, setIcons] = useState<Icon[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [sData, iData] = await Promise.all([
        api.get<SocialNetwork[]>("/social-networks"),
        api.get<Icon[]>("/icons")
      ]);
      
      const formattedSocials = (sData || []).map(s => {
        let url = s.url;
        const identifier = `${s.name} ${s.icon?.name} ${s.icon?.lucide_name}`.toLowerCase();
        
        if (identifier.includes('whatsapp') || identifier.includes('message') || identifier.includes('phone')) {
          if (url && !url.startsWith('http') && !url.startsWith('https') && !url.startsWith('wa.me')) {
            // Remove any non-digit characters except maybe a leading +
            const cleanNumber = url.replace(/[^\d+]/g, '');
            if (cleanNumber.length >= 8) {
              url = `https://wa.me/${cleanNumber}`;
            }
          }
        }
        return { ...s, url };
      });

      setSocials(formattedSocials);
      setIcons(iData || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  return { socials, icons, loading, refresh: fetchAll };
}
