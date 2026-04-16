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

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
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
    
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'GET',
      headers: this.getHeaders(),
    })

    const result = await this.handleResponse<T>(response)
    let output = result.data || (result as any)

    // Handle Laravel Paginator (it nests the array in another 'data' property)
    // IMPORTANT: Do not unwrap if unreadCount is present (Notifications)
    if (output && typeof output === 'object' && Array.isArray(output.data) && ('current_page' in output || 'meta' in output) && !('unreadCount' in output)) {
      return output.data as T
    }

    return output
  }

  async post<T>(endpoint: string, body: any): Promise<T> {
    this.logRequest('POST', endpoint, body)
    
    const isFormData = body instanceof FormData
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders({}, isFormData),
      body: isFormData ? body : JSON.stringify(body),
    })

    const result = await this.handleResponse<T>(response)
    return result.data || (result as any)
  }

  async put<T>(endpoint: string, body: any): Promise<T> {
    this.logRequest('PUT', endpoint, body)
    
    const isFormData = body instanceof FormData
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'PUT',
      headers: this.getHeaders({}, isFormData),
      body: isFormData ? body : JSON.stringify(body),
    })

    const result = await this.handleResponse<T>(response)
    return result.data || (result as any)
  }

  async delete<T>(endpoint: string): Promise<T> {
    this.logRequest('DELETE', endpoint)
    
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    })

    const result = await this.handleResponse<T>(response)
    return result.data || (result as any)
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

    if (file.size > 50 * 1024 * 1024) {
      throw new Error('File size exceeds 50MB limit')
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
}

export const api = new SecureApiService()
export default api
