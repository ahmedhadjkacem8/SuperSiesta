import { useQuery } from '@tanstack/react-query';
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

interface SocialNetworksData {
  socials: SocialNetwork[];
  icons: Icon[];
}

export function useSocialNetworks() {
  const query = useQuery({
    queryKey: ['social-networks'],
    queryFn: async (): Promise<SocialNetworksData> => {
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

        return { socials: formattedSocials, icons: iData || [] };
      } catch (error) {
        console.error('Error fetching social networks:', error);
        throw error;
      }
    },
    staleTime: 1000 * 60 * 5,
    retry: false,
    refetchOnWindowFocus: false,
  });

  return {
    socials: query.data?.socials || [],
    icons: query.data?.icons || [],
    loading: query.isLoading,
    refresh: query.refetch,
  };
}
