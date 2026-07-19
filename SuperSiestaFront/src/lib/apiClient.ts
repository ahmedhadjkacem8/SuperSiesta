/**
 * Secure API Service for Super Siesta
 * Features:
 * - Token-based authentication with expiration handling
 * - CSRF protection
 * - Rate limit awareness
 * - Automatic token refresh
 * - Secure file upload with validation
 * - Request/Response logging in development
 */

const API_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')
const API_ROOT = (import.meta.env.VITE_API_ROOT || (API_URL.startsWith('http') ? API_URL.replace(/\/api$/, '') : '')).replace(/\/+$/, '')
const isDevelopment = import.meta.env.DEV

interface ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
}

interface RateLimitInfo {
  limit: number
  remaining: number
  reset: number
}

class SecureApiService {
  private token: string | null = null
  private csrfToken: string | null = null
  private rateLimitInfo: RateLimitInfo | null = null
  private requestQueue: Array<() => Promise<any>> = []
  private isProcessingQueue = false

  constructor() {
    if (typeof localStorage !== 'undefined') {
      this.token = localStorage.getItem('auth_token')
      this.csrfToken = localStorage.getItem('csrf_token')
    }
  }

  setToken(token: string) {
    this.token = token
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('auth_token', token)
    }
  }

  setCsrfToken(token: string) {
    this.csrfToken = token
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('csrf_token', token)
    }
  }

  clearToken() {
    this.token = null
    this.csrfToken = null
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('csrf_token')
    }
  }

  private getHeaders(custom: HeadersInit = {}, isFormData: boolean = false): HeadersInit {
    const headers: HeadersInit = {
      'Accept': 'application/json',
      ...custom,
    }

    // Only set Content-Type for non-FormData requests
    if (!isFormData) {
      headers['Content-Type'] = 'application/json'
    }

    // Add Authorization header if token exists
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }

    // Add CSRF token if available
    if (this.csrfToken) {
      headers['X-CSRF-TOKEN'] = this.csrfToken
    }

    return headers
  }

  private extractRateLimitInfo(response: Response): void {
    const limit = response.headers.get('X-RateLimit-Limit')
    const remaining = response.headers.get('X-RateLimit-Remaining')
    const reset = response.headers.get('X-RateLimit-Reset')

    if (limit && remaining && reset) {
      this.rateLimitInfo = {
        limit: parseInt(limit),
        remaining: parseInt(remaining),
        reset: parseInt(reset),
      }
    }
  }

  private logRequest(method: string, endpoint: string, body?: any) {
    // Logging disabled
  }

  private logResponse(response: Response, data?: any) {
    // Logging disabled
  }

  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    // Extract rate limit info from response headers
    this.extractRateLimitInfo(response)

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired or invalid — only redirect if user was authenticated
        if (this.token) {
          this.clearToken()
          window.location.href = '/connexion'
        }
        throw new Error('Session expired. Please login again.')
      }

      if (response.status === 429) {
        // Rate limited
        const resetTime = this.rateLimitInfo?.reset || Date.now() / 1000
        throw new Error(`Too many requests. Please try again at ${new Date(resetTime * 1000).toLocaleTimeString()}`)
      }

      const error = await response.json().catch(() => ({ message: response.statusText }))
      this.logResponse(response, error)
      throw new Error(error.message || `API Error: ${response.statusText}`)
    }

    const result = await response.json()
    this.logResponse(response, result)
    return result
  }

  async get<T>(endpoint: string): Promise<T> {
    this.logRequest('GET', endpoint)
    
    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'GET',
        headers: {
          ...this.getHeaders(),
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      })

      const result = await this.handleResponse<T>(response)
    let output = result.data || (result as any)

    // If caller requested raw paginator (useful for admin pagination), return full output including meta
    if (endpoint.includes('_raw=1')) {
      return output as T
    }

    // Handle Laravel Paginator (it nests the array in another 'data' property)
    // IMPORTANT: Do not unwrap if unreadCount is present (Notifications)
    if (output && typeof output === 'object' && Array.isArray(output.data) && ('current_page' in output || 'meta' in output) && !('unreadCount' in output)) {
      return output.data as T
    }

      return output
    } catch (error) {
      throw new Error('Impossible de joindre l’API. Vérifiez que le backend est démarré et que l’URL est correcte.')
    }
  }

  async post<T>(endpoint: string, body: any): Promise<T> {
    this.logRequest('POST', endpoint, body)
    
    try {
      const isFormData = body instanceof FormData
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: this.getHeaders({}, isFormData),
        body: isFormData ? body : JSON.stringify(body),
      })

      const result = await this.handleResponse<T>(response)
      return result.data || (result as any)
    } catch (error) {
      throw new Error('Impossible de joindre l’API. Vérifiez que le backend est démarré et que l’URL est correcte.')
    }
  }

  async put<T>(endpoint: string, body: any): Promise<T> {
    this.logRequest('PUT', endpoint, body)
    
    try {
      const isFormData = body instanceof FormData
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'PUT',
        headers: this.getHeaders({}, isFormData),
        body: isFormData ? body : JSON.stringify(body),
      })

      const result = await this.handleResponse<T>(response)
      return result.data || (result as any)
    } catch (error) {
      throw new Error('Impossible de joindre l’API. Vérifiez que le backend est démarré et que l’URL est correcte.')
    }
  }

  async delete<T>(endpoint: string): Promise<T> {
    this.logRequest('DELETE', endpoint)
    
    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      })

      const result = await this.handleResponse<T>(response)
      return result.data || (result as any)
    } catch (error) {
      throw new Error('Impossible de joindre l’API. Vérifiez que le backend est démarré et que l’URL est correcte.')
    }
  }

  /**
   * Secure file upload with client-side validation
   */
  async uploadFile(file: File, folder: string = 'uploads'): Promise<any> {
    // Client-side validation
    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'video/x-msvideo',
      'application/pdf',
    ]

    if (!allowedMimes.includes(file.type)) {
      throw new Error(`File type ${file.type} is not allowed`)
    }

    // Allow larger files up to 200MB (server must also allow this via php.ini)
    if (file.size > 200 * 1024 * 1024) {
      throw new Error('File size exceeds 200MB limit')
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('folder', folder)

    return this.post('/upload', formData)
  }

  /**
   * Get a signed temporary URL for file access
   */
  async getSignedUrl(filePath: string): Promise<string> {
    const response = await this.post<{ url: string }>('/files/signed-url', { path: filePath })
    return (response as any).url || response
  }

  /**
   * Get rate limit information from last request
   */
  getRateLimitInfo(): RateLimitInfo | null {
    return this.rateLimitInfo
  }

  /**
   * Construit l'URL publique d'un fichier stocké (image OG/Twitter, uploads, etc.)
   */
  getFileUrl(path: string | null | undefined): string {
    if (!path) return ''
    if (path.startsWith('http')) return path
    const cleanedPath = path.replace(/^\/+/, '')
    if (!API_ROOT) return `/${cleanedPath}`
    return `${API_ROOT}/${cleanedPath}`
  }

  // Products
  getProducts(params?: { categorie?: string; fermete?: string; gamme?: string; in_promo?: boolean; per_page?: number }) {
    const query = new URLSearchParams()
    if (params?.categorie) query.append('categorie', params.categorie)
    if (params?.fermete) query.append('fermete', params.fermete)
    if (params?.gamme) query.append('gamme', params.gamme)
    if (params?.in_promo) query.append('in_promo', String(params.in_promo))
    if (params?.per_page) query.append('per_page', String(params.per_page))

    return this.get(`/products?${query.toString()}`)
  }

  getProduct(id: string) {
    return this.get(`/products/${id}`)
  }

  getProductSizes(productId: string) {
    return this.get(`/products/${productId}/sizes`)
  }

  // Orders
  getOrders(params?: { status?: string; per_page?: number }) {
    const query = new URLSearchParams()
    if (params?.status) query.append('status', params.status)
    if (params?.per_page) query.append('per_page', String(params.per_page))

    return this.get(`/orders?${query.toString()}`)
  }

  getOrder(id: string) {
    return this.get(`/orders/${id}`)
  }

  createOrder(order: {
    full_name: string
    phone: string
    address: string
    city: string
    notes?: string
    items: Array<{
      product_id: string
      product_name: string
      size_label: string
      unit_price: number
      quantity: number
    }>
  }) {
    return this.post('/orders', order)
  }

  // Blog Posts
  getBlogPosts(params?: { category?: string; per_page?: number; is_favorite?: boolean }) {
    const query = new URLSearchParams()
    if (params?.category) query.append('category', params.category)
    if (params?.per_page) query.append('per_page', String(params.per_page))
    if (params?.is_favorite) query.append('is_favorite', '1')

    return this.get(`/blog-posts?${query.toString()}`)
  }

  getBlogPost(id: string) {
    return this.get(`/blog-posts/${id}`)
  }

  // SEO Management (admin)
  getSeoMetas(params?: { per_page?: number; q?: string; type?: string }) {
    const query = new URLSearchParams();

    query.append('per_page', String(params?.per_page || 100));

    if (params?.q) query.append('q', params.q);
    if (params?.type) query.append('type', params.type);

    return this.get(`/seo?${query.toString()}`);
  }

  getSeoStats() {
    return this.get('/seo/stats')
  }

  getSeoMeta(id: number | string) {
    return this.get(`/seo/${id}`)
  }

  createSeoMeta(data: any) {
    return this.post('/seo', data)
  }

  updateSeoMeta(id: number | string, data: any) {
    return this.put(`/seo/${id}`, data)
  }

  deleteSeoMeta(id: number | string) {
    return this.delete(`/seo/${id}`)
  }

  analyzeSeoMeta(id: number | string) {
    return this.post(`/seo/${id}/analyze`, {})
  }

  analyzeSeoMetaBulk(ids?: (number | string)[]) {
    return this.post('/seo/analyze-bulk', { ids: ids ?? [] })
  }

  getSeoScoreHistory(id: number | string) {
    return this.get(`/seo/${id}/history`)
  }

  /** Trigger the seo:sync-all command on the server to re-generate all auto-managed JSON-LD entries */
  resyncSeoEntities(options?: { type?: 'products' | 'categories' | 'showrooms' | 'blog'; force?: boolean }) {
    return this.post('/seo/resync', options ?? {})
  }

  // Public : SEO résolu pour une page donnée (fallback inclus côté backend)
  getSeoByPage(identifier: string) {
    return this.get(`/seo/page/${encodeURIComponent(identifier)}`)
  }

  // Showrooms
  getShowrooms(params?: { per_page?: number }) {
    const query = new URLSearchParams()
    if (params?.per_page) query.append('per_page', String(params.per_page))

    return this.get(`/showrooms?${query.toString()}`)
  }

  getShowroom(id: string) {
    return this.get(`/showrooms/${id}`)
  }

  // Hero Slides
  getHeroSlides() {
    return this.get('/hero-slides')
  }

  // Gammes
  getGammes(params?: { per_page?: number }) {
    const query = new URLSearchParams()
    if (params?.per_page) query.append('per_page', String(params.per_page))

    return this.get(`/gammes?${query.toString()}`)
  }

  getGamme(id: string) {
    return this.get(`/gammes/${id}`)
  }

  // Site Content
  getSiteContent(params?: { page?: string; section?: string }) {
    const query = new URLSearchParams()
    if (params?.page) query.append('page', params.page)
    if (params?.section) query.append('section', params.section)

    return this.get(`/site-content?${query.toString()}`)
  }

  getSiteContentByKey(key: string) {
    return this.get(`/site-content/${key}`)
  }

  // About Sections
  getAboutSections() {
    return this.get('/about-sections')
  }

  // User/Auth
  getUser() {
    return this.get('/user')
  }

  // Prospects
  getProspects(params?: { status?: string; search?: string }): Promise<any> {
    const query = new URLSearchParams()
    if (params?.status) query.append('status', params.status)
    if (params?.search) query.append('search', params.search)
    query.append('_t', String(Date.now())) // cache-buster

    return this.get(`/prospects?${query.toString()}`)
  }
}

export const api = new SecureApiService()
export default api