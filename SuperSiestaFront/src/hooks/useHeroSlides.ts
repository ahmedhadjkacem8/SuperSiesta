import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";

export interface HeroSlide {
  id: string;
  title: string | null;
  subtitle: string | null;
  cta_text: string | null;
  cta_link: string | null;
  image_url: string;
  sort_order: number;
  active: boolean;
}

export const useHeroSlides = (onlyActive = false) => {
  return useQuery({
    queryKey: ['hero-slides', onlyActive],
    queryFn: async () => {
      const data = await api.get<HeroSlide[]>("/hero-slides");
      const sorted = (data || []).sort((a, b) => a.sort_order - b.sort_order);
      if (onlyActive) {
        return sorted.filter(s => s.active);
      }
      return sorted;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useHeroSlidesActions = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ id, data, method = 'POST' }: { id?: string, data: FormData | any, method?: string }) => {
      if (method === 'DELETE' && id) {
        return api.delete(`/hero-slides/${id}`);
      }
      if (id && id !== 'new') {
        // Use method spoofing if it's FormData
        if (data instanceof FormData) {
          data.append('_method', 'PUT');
          return api.post(`/hero-slides/${id}`, data);
        }
        return api.put(`/hero-slides/${id}`, data);
      }
      return api.post("/hero-slides", data);
    },
    onSuccess: () => {
      // Invalidate both lists (all and only active)
      queryClient.invalidateQueries({ queryKey: ['hero-slides'] });
    },
  });

  return mutation;
};
