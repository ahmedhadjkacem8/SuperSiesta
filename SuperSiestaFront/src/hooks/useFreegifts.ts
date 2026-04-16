import { useEffect, useState } from 'react'
import { api } from '@/lib/apiClient'

export interface FreeGift {
  id: string | number
  titre: string
  description: string | null
  image: string | null
  poids: number
  products?: any[]
  created_at?: string
  updated_at?: string
}

export function useFreegifts() {
  const [freeGifts, setFreeGifts] = useState<FreeGift[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchFreeGifts = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await api.get<any>('/free-gifts')
      const giftsList = Array.isArray(data) ? data : (data as any).data || []
      setFreeGifts(giftsList)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch free gifts'
      console.error('Error fetching free gifts:', err)
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFreeGifts()
  }, [])

  return { 
    data: freeGifts, 
    isLoading: loading, 
    error,
    refetch: fetchFreeGifts
  }
}

export function useFreegiftsByProduct(productId: string | undefined) {
  const [freeGifts, setFreeGifts] = useState<FreeGift[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!productId) return

    const fetchGifts = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await api.get<any>(`/products/${productId}/free-gifts`)
        const giftsList = Array.isArray(data) ? data : (data as any).data || []
        setFreeGifts(giftsList)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch free gifts'
        console.error('Error fetching free gifts:', err)
        setError(errorMessage)
      } finally {
        setLoading(false)
      }
    }

    fetchGifts()
  }, [productId])

  return { data: freeGifts, isLoading: loading, error }
}
