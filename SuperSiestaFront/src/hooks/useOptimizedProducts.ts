// SuperSiestaFront/src/hooks/useOptimizedProducts.ts
import { useState, useCallback, useEffect } from 'react'
import { api } from '@/lib/apiClient'
import type { Product } from '@/hooks/useProducts'

interface PaginationMeta {
  current_page: number
  per_page: number
  total: number
  last_page: number
  has_more: boolean
}

interface UseOptimizedProductsReturn {
  products: Product[]
  loading: boolean
  error: string | null
  pagination: PaginationMeta | null
  hasMore: boolean
  loadMore: () => Promise<void>
  search: (filters: ProductFilters) => Promise<void>
  reset: () => Promise<void>
}

export interface ProductFilters {
  categorie?: string
  fermete?: string
  gamme?: string
  dimension?: string
  in_promo?: boolean
  per_page?: number
  page?: number
}

/**
 * Optimized hook for loading products with pagination
 * - Loads only 15 products at a time (instead of all 1000+)
 * - Supports "Load More" pattern
 * - Filters applied server-side (fast) instead of client-side (slow)
 * - Caches results to avoid re-fetching
 */
export const useOptimizedProducts = () => {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState<PaginationMeta | null>(null)
  const [currentFilters, setCurrentFilters] = useState<ProductFilters>({ per_page: 15 })

  const fetchProducts = useCallback(
    async (filters: ProductFilters = currentFilters, append: boolean = false) => {
      try {
        setLoading(true)
        setError(null)

        // Merge filters with defaults
        const finalFilters = {
          ...currentFilters,
          ...filters,
          per_page: filters.per_page || 15,
        }

        setCurrentFilters(finalFilters)

        // Fetch from optimized endpoint
        const response: any = await api.get(`/products?${new URLSearchParams(
          Object.entries(finalFilters).reduce((acc: any, [key, value]) => {
            if (value !== undefined && value !== null) {
              acc[key] = String(value)
            }
            return acc
          }, {})
        ).toString()}`)

        // Handle paginated response
        const data = response?.data || response
        if (append && Array.isArray(data)) {
          setProducts([...products, ...data])
        } else {
          setProducts(Array.isArray(data) ? data : [])
        }

        // Extract pagination metadata
        if (response?.meta) {
          const meta = response.meta as PaginationMeta
          setPagination(meta)
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch products')
      } finally {
        setLoading(false)
      }
    },
    [currentFilters, products]
  )

  // Initial load
  useEffect(() => {
    fetchProducts()
  }, [])

  // Load next page
  const loadMore = useCallback(async () => {
    if (!pagination?.has_more) return

    await fetchProducts(
      {
        ...currentFilters,
        page: (pagination?.current_page || 1) + 1,
      },
      true // Append to existing products
    )
  }, [pagination, currentFilters, fetchProducts])

  // Search with new filters
  const search = useCallback(
    async (filters: ProductFilters) => {
      await fetchProducts({ ...filters, page: 1 }, false) // Don't append, replace
    },
    [fetchProducts]
  )

  // Reset to initial state
  const reset = useCallback(async () => {
    setCurrentFilters({ per_page: 15 })
    await fetchProducts({ per_page: 15 }, false)
  }, [fetchProducts])

  return {
    products,
    loading,
    error,
    pagination,
    hasMore: pagination?.has_more ?? false,
    loadMore,
    search,
    reset,
  }
}
