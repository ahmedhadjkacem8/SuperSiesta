import { useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/apiClient'

export interface ProductSize {
  id: string
  label: string
  price: number
  originalPrice?: number
  resellerPrice?: number
}

export interface Product {
  id: string
  name: string
  slug: string
  categorie: string
  fermete: string
  image: string
  images: string[]
  sizes: ProductSize[]
  description: string
  specs: string[]
  badge?: string
  inPromo?: boolean
  gamme?: string
  freeGifts?: Array<{
    id: string | number
    titre: string
    description: string | null
    image: string | null
    poids: number
  }>
}

interface UseProductsOptions {
  categorie?: string
  fermete?: string
  gamme?: string
  in_promo?: boolean
}

// Type for API response
interface ApiProduct {
  id: string
  name: string
  slug: string
  categorie: string
  fermete: string
  image: string
  images?: string[]
  sizes?: Array<{
    id: string
    label: string
    price: number | string
    original_price?: number | string
    reseller_price?: number | string
  }>
  description?: string
  specs?: string[]
  badge?: string
  in_promo?: boolean
  gamme?: string
  free_gifts?: Array<{
    id: string | number
    titre: string
    description?: string | null
    image?: string | null
    poids?: number
  }>
}

// Mapper function to convert API response to Product interface
export const mapApiProductToProduct = (apiProduct: ApiProduct): Product => {
  return {
    id: apiProduct.id || '',
    name: apiProduct.name || '',
    slug: apiProduct.slug || '',
    categorie: apiProduct.categorie || '',
    fermete: apiProduct.fermete || '',
    image: apiProduct.image || '',
    images: Array.isArray(apiProduct.images) ? apiProduct.images : [],
    sizes: Array.isArray(apiProduct.sizes)
      ? apiProduct.sizes.map((s) => ({
          id: s.id || '',
          label: s.label || '',
          price: Number(s.price) || 0,
          originalPrice: s.original_price ? Number(s.original_price) : undefined,
          resellerPrice: s.reseller_price ? Number(s.reseller_price) : undefined,
        }))
      : [],
    description: apiProduct.description || '',
    specs: Array.isArray(apiProduct.specs) ? apiProduct.specs : [],
    badge: apiProduct.badge || undefined,
    inPromo: Boolean(apiProduct.in_promo),
    gamme: apiProduct.gamme || undefined,
    freeGifts: Array.isArray(apiProduct.free_gifts)
      ? apiProduct.free_gifts.map((g) => ({
          id: g.id || '',
          titre: g.titre || '',
          description: g.description || null,
          image: g.image || null,
          poids: Number(g.poids) || 0,
        }))
      : [],
  }
}

export function useProducts(options?: UseProductsOptions) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await api.getProducts(options)
        
        // Handle both direct array and paginated response
        const productList: ApiProduct[] = Array.isArray(response)
          ? response
          : (response as any)?.data || []
        
        // Validate and map products
        const mappedProducts = productList
          .filter((p): p is ApiProduct => p && typeof p === 'object')
          .map(mapApiProductToProduct)
        
        setProducts(mappedProducts)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch products'
        console.error('Error fetching products:', err)
        setError(errorMessage)
        setProducts([])
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [options?.categorie, options?.fermete, options?.gamme, options?.in_promo])

  return { data: products, isLoading: loading, error }
}

export function useProduct(slug: string | undefined) {
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) {
      setProduct(null)
      setLoading(false)
      return
    }

    const fetchProduct = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await api.getProduct(slug)
        
        // Safely cast response to ApiProduct
        const apiProduct = response as ApiProduct
        
        // Validate minimum required fields
        if (!apiProduct?.id || !apiProduct?.name) {
          throw new Error('Invalid product data received')
        }
        
        const mappedProduct = mapApiProductToProduct(apiProduct)
        setProduct(mappedProduct)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch product'
        console.error('Error fetching product:', err)
        setError(errorMessage)
        setProduct(null)
      } finally {
        setLoading(false)
      }
    }

    fetchProduct()
  }, [slug])

  return { product, isLoading: loading, error }
}

export function useCategories(products: Product[] | undefined) {
  return useCallback(() => {
    if (!products || products.length === 0) {
      return {
        categories: ['Tous'],
        fermetes: ['Tous'],
        allDimensions: [],
        gammes: ['Tous'],
      }
    }

    const categories = [
      'Tous',
      ...new Set(
        products
          .map((p) => p.categorie)
          .filter(Boolean)
      ),
    ].filter(Boolean) as string[]

    const fermetes = [
      'Tous',
      ...new Set(
        products
          .map((p) => p.fermete)
          .filter(Boolean)
      ),
    ].filter(Boolean) as string[]

    const allDimensions = [
      ...new Set(
        products
          .flatMap((p) => p.sizes.map((s) => s.label))
          .filter(Boolean)
      ),
    ].filter(Boolean) as string[]

    const gammes = [
      'Tous',
      ...new Set(
        products
          .map((p) => p.gamme)
          .filter(Boolean)
      ),
    ].filter(Boolean) as string[]

    return { categories, fermetes, allDimensions, gammes }
  }, [products])()
}
