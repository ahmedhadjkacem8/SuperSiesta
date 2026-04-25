import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/apiClient'

export interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt?: string
  content: string
  image_url?: string
  category: string
  tags?: string[]
  published: boolean
  is_favorite: boolean
  sort_order: number
  published_at?: string
  created_at: string
  updated_at: string
}

export function useBlogPosts(params?: { category?: string; is_favorite?: boolean; per_page?: number }) {
  return useQuery({
    queryKey: ['blog-posts', params],
    queryFn: async () => {
      const data = await api.getBlogPosts(params)
      const postsList = Array.isArray(data) ? data : (data as any).data || []
      return postsList as BlogPost[]
    },
    staleTime: 1000 * 30, // 30 seconds instead of 5 minutes for better responsiveness
  })
}

export function useBlogPost(slug: string | undefined) {
  return useQuery({
    queryKey: ['blog-post', slug],
    queryFn: async () => {
      if (!slug) return null
      const data = await api.getBlogPost(slug)
      return data as BlogPost
    },
    enabled: !!slug,
  })
}

export function useBlogActions() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async ({ id, data, method = 'POST' }: { id?: string, data: FormData | any, method?: string }) => {
      if (method === 'DELETE' && id) {
        return api.delete(`/blog-posts/${id}`)
      }
      if (id) {
        if (data instanceof FormData) {
          data.append('_method', 'PUT')
          return api.post(`/blog-posts/${id}`, data)
        }
        return api.put(`/blog-posts/${id}`, data)
      }
      return api.post('/blog-posts', data)
    },
    // Optimistic Updates
    onMutate: async (variables) => {
      // Only for simple toggles (not FormData)
      if (variables.id && !(variables.data instanceof FormData) && variables.method !== 'DELETE') {
        await queryClient.cancelQueries({ queryKey: ['blog-posts'] })
        const previousPosts = queryClient.getQueryData(['blog-posts'])

        queryClient.setQueriesData({ queryKey: ['blog-posts'] }, (old: any) => {
          if (!old) return old
          let newPosts = []
          if (Array.isArray(old)) {
            newPosts = old.map((p: any) => p.id === variables.id ? { ...p, ...variables.data } : p)
          } else {
            return old
          }

          // If sort_order was changed, re-sort the list immediately
          if (variables.data.sort_order !== undefined) {
            return [...newPosts].sort((a: any, b: any) => a.sort_order - b.sort_order)
          }
          
          return newPosts
        })

        return { previousPosts }
      }
    },
    onError: (err, variables, context: any) => {
      if (context?.previousPosts) {
        queryClient.setQueryData(['blog-posts'], context.previousPosts)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['blog-posts'] })
      queryClient.invalidateQueries({ queryKey: ['blog-post'] })
    },
  })

  return mutation
}
