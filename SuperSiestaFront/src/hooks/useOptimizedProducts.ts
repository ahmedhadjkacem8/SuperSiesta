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
export const useOptimizedProducts = (initialFilters?: ProductFilters, options?: { preloadAll?: boolean; maxPerPage?: number }) => {
  const [products, setProducts] = useState<Product[]>([])
  // Cache of fetched products used for client-side filtering
  const [cachedProducts, setCachedProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState<PaginationMeta | null>(null)
  const [currentFilters, setCurrentFilters] = useState<ProductFilters>({ per_page: 15, ...(initialFilters || {}) })

  const fetchProducts = useCallback(
    async (filters: ProductFilters = currentFilters, append: boolean = false, replace: boolean = false) => {
      try {
        setLoading(true)
        setError(null)

        // Merge filters with defaults
        let finalFilters: ProductFilters
        if (replace) {
          finalFilters = {
            per_page: filters.per_page || 15,
            ...filters,
          }
        } else {
          finalFilters = {
            ...currentFilters,
            ...filters,
            per_page: filters.per_page || 15,
          }
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
        const received = Array.isArray(data) ? data : []
        if (append) {
          setCachedProducts((prev) => [...prev, ...received])
          setProducts((prev) => [...prev, ...received])
        } else {
          setCachedProducts(received)
          setProducts(received)
        }

        // Extract pagination metadata
        if (response?.meta) {
          const meta = response.meta as PaginationMeta
          setPagination(meta)
        }

        // Return the received items for callers that want to use them immediately
        return received
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
    const doInit = async () => {
      if (options?.preloadAll) {
        // fetch all products once (use a large per_page) WITHOUT server-side filters
        const per = options.maxPerPage || 10000
        const received = await fetchProducts({ per_page: per }, false, true)

        // If initialFilters were provided (from URL), apply them client-side for initial view
        if (initialFilters && Object.keys(initialFilters).length > 0) {
          // Ensure currentFilters reflect initial filters for future pagination/search
          setCurrentFilters({ per_page: 15, ...(initialFilters || {}) })
          try {
            filterClientSide(initialFilters, received || undefined)
          } catch (e) {
            // ignore
          }
        }
      } else {
        await fetchProducts()
      }
    }

    doInit()
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

  // Client-side filtering using cachedProducts (immediate, no API call)
  const filterClientSide = useCallback((filters: ProductFilters, dataset?: Product[]) => {
    const source = dataset && dataset.length > 0 ? dataset : cachedProducts
    if (!source || source.length === 0) {
      setProducts([])
      return
    }

    const norm = (v: any) => (v === undefined || v === null) ? '' : String(v).toLowerCase().trim()

    const filtered = source.filter((p) => {
      if (filters.categorie && filters.categorie !== 'Tous') {
        if (norm(p.categorie) !== norm(filters.categorie)) return false
      }
      if (filters.fermete && filters.fermete !== 'Tous') {
        if (norm(p.fermete) !== norm(filters.fermete)) return false
      }
      if (filters.gamme && filters.gamme !== 'Tous') {
        if (norm(p.gamme) !== norm(filters.gamme)) return false
      }
      if (filters.dimension && filters.dimension !== 'Tous') {
        const hasSize = p.sizes && p.sizes.some(s => norm(s.label) === norm(filters.dimension))
        if (!hasSize) return false
      }
      return true
    })

    setProducts(filtered)
  }, [cachedProducts])

  // Search with new filters
  const search = useCallback(
    async (filters: ProductFilters) => {
      // If we've preloaded all products, prefer client-side filtering to avoid server calls
      if (options?.preloadAll && cachedProducts && cachedProducts.length > 0) {
        filterClientSide(filters)
        return
      }

      await fetchProducts({ ...filters, page: 1 }, false, true) // Don't append, replace existing filters
    },
    [fetchProducts, cachedProducts, options?.preloadAll, filterClientSide]
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
    filterClientSide,
    reset,
  }
}
