import { useEffect, useState } from 'react'
import { api } from '@/lib/apiClient'

export interface Gamme {
  id: string
  name: string
  slug: string
  description: string | null
  video_url: string | null
  photos: string[]
  images_3d: string[]
  sort_order: number
}

export function useGammes() {
  const [gammes, setGammes] = useState<Gamme[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchGammes = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await api.getGammes()
        const gammesList = Array.isArray(data) ? data : (data as any).data || []
        const mappedGammes = gammesList.map((g: any) => ({
          id: g.id,
          name: g.name,
          slug: g.slug,
          description: g.description,
          video_url: g.video_url,
          photos: g.photos || [],
          images_3d: g.images_3d || [],
          sort_order: g.sort_order,
        }))
        setGammes(mappedGammes)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch gammes'
        console.error('Error fetching gammes:', err)
        setError(errorMessage)
      } finally {
        setLoading(false)
      }
    }

    fetchGammes()
  }, [])

  return { data: gammes, isLoading: loading, error }
}

export function useGamme(slug: string | undefined) {
  const [gamme, setGamme] = useState<Gamme | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) return

    const fetchGamme = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await api.getGamme(slug)
        const mappedGamme: Gamme = {
          id: (data as any).id,
          name: (data as any).name,
          slug: (data as any).slug,
          description: (data as any).description,
          video_url: (data as any).video_url,
          photos: (data as any).photos || [],
          images_3d: (data as any).images_3d || [],
          sort_order: (data as any).sort_order,
        }
        setGamme(mappedGamme)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch gamme'
        console.error('Error fetching gamme:', err)
        setError(errorMessage)
      } finally {
        setLoading(false)
      }
    }

    fetchGamme()
  }, [slug])

  return { gamme, isLoading: loading, error }
}
