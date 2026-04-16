import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
import { toast } from "sonner";

export interface AboutSection {
  id: number;
  type: 'standard' | 'cards' | 'stats';
  title: string | null;
  subtitle: string | null;
  description: string | null;
  image_url: string | null;
  items: any[] | null;
  sort_order: number;
  is_active: boolean;
}

export const useAboutSections = (onlyActive = false) => {
  const queryClient = useQueryClient();

  // Query pour récupérer les sections
  const { data: sections = [], isLoading, refetch } = useQuery({
    queryKey: ["about-sections"],
    queryFn: async () => {
      const data = await api.get<AboutSection[]>("/about-sections");
      return data;
    },
  });

  // Filtrer si nécessaire (pour le côté client)
  const displaySections = onlyActive 
    ? sections.filter(s => s.is_active) 
    : sections;

  // Mutation pour réordonner
  const reorderMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      return api.post("/about-sections/reorder", { ids });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["about-sections"] });
    },
    onError: () => {
      toast.error("Erreur lors de la synchronisation de l'ordre");
    }
  });

  // Mutation pour supprimer
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return api.delete(`/about-sections/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["about-sections"] });
      toast.success("Section supprimée");
    }
  });

  return {
    sections: displaySections,
    allSections: sections,
    isLoading,
    reorderMutation,
    deleteMutation,
    refresh: refetch
  };
};
