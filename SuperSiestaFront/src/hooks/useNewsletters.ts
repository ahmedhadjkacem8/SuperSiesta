import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
import { toast } from "sonner";

export interface Newsletter {
  id: number;
  email: string;
  created_at: string;
}

export const useNewsletters = (options?: { fetchList?: boolean }) => {
  const queryClient = useQueryClient();

  // Only fetch the full list when explicitly requested (admin).
  const query = useQuery({
    queryKey: ["newsletters"],
    queryFn: () => api.get<Newsletter[]>("/newsletters"),
    enabled: !!options?.fetchList,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/newsletters/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["newsletters"] });
      toast.success("Email supprimé");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erreur lors de la suppression");
    },
  });

  const subscribeMutation = useMutation({
    mutationFn: (email: string) => api.post("/newsletters", { email }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["newsletters"] });
    },
  });

  return {
    // When not fetching list, return empty array to avoid exposing subscribers to clients
    newsletters: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    deleteEmail: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    subscribe: subscribeMutation.mutateAsync,
    isSubscribing: subscribeMutation.isPending,
    refresh: query.refetch,
  };
};
