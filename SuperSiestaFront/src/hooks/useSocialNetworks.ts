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
      setSocials(sData || []);
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
