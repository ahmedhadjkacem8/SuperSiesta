import { useEffect, useState } from 'react'
import { api } from '@/lib/apiClient'

interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt?: string
  content: string
  image_url?: string
  category: string
  tags?: string[]
  published: boolean
  published_at?: string
  created_at: string
  updated_at: string
}

export function useBlogPosts(category?: string) {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await api.getBlogPosts({ category })
        const postsList = Array.isArray(data) ? data : (data as any).data || []
        setPosts(postsList)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch blog posts'
        console.error('Error fetching blog posts:', err)
        setError(errorMessage)
      } finally {
        setLoading(false)
      }
    }

    fetchPosts()
  }, [category])

  return { posts, loading, error }
}

export function useBlogPost(postId: string) {
  const [post, setPost] = useState<BlogPost | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!postId) return

    const fetchPost = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await api.getBlogPost(postId)
        setPost(data as BlogPost)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch blog post'
        console.error('Error fetching blog post:', err)
        setError(errorMessage)
      } finally {
        setLoading(false)
      }
    }

    fetchPost()
  }, [postId])

  return { post, loading, error }
}
