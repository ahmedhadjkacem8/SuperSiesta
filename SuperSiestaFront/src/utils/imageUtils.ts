// SuperSiestaFront/src/utils/imageUtils.ts

/**
 * Utilitaires pour gérer les URLs d'images dans l'application
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

/**
 * Convertit une image URL en URL publique Si elle vient de la DB
 * @param imagePath Chemin relatif ou URL complète de l'image
 * @returns URL complète ou chemin relatif pour direct access
 */
export function getImageUrl(imagePath: string | null | undefined): string {
  if (!imagePath) return ''

  // Nettoyer les anciennes URLs avec IP hardcodées en DB
  imagePath = imagePath.replace(/^http:\/\/135\.125\.202\.39:8000/, '')

  // Normaliser les slashes multiples en un seul
  imagePath = imagePath.replace(/\/+/g, '/')

  // Si c'est déjà une URL complète
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath
  }

  // Si c'est un chemin relatif vers stockage (images, vidéos, etc.)
  // Always bypass /api proxy for static files - they go directly to /storage
  if (imagePath.startsWith('/uploads') || imagePath.startsWith('/storage')) {
    if (API_URL.startsWith('http://') || API_URL.startsWith('https://')) {
      // Absolute URL: strip /api and use base domain
      const base = API_URL.replace(/\/api\/?$/, '')
      return `${base}${imagePath}`
    }
    // Relative path (like /api): return storage path as-is to bypass proxy
    // Browser will request /storage/... directly on current origin
    return imagePath
  }

  // Par défaut, considère que c'est un chemin relatif sans /storage prefix
  // Always use /storage directly, never /api/storage (Nginx doesn't have that route)
  if (API_URL.startsWith('http://') || API_URL.startsWith('https://')) {
    const base = API_URL.replace(/\/api\/?$/, '')
    return `${base}/storage/${imagePath}`
  }
  // Relative API_URL: return /storage directly (bypasses /api proxy)
  return `/storage/${imagePath}`
}

/**
 * Vérifie si une URL d'image est valide
 */
export function isValidImageUrl(url: string): boolean {
  if (!url) return false
  try {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']
    const lowerUrl = url.toLowerCase()
    return imageExtensions.some(ext => lowerUrl.includes(ext))
  } catch {
    return false
  }
}

/**
 * Obtient une image avec fallback
 */
export function getImageWithFallback(
  imagePath: string | null | undefined,
  fallback: string = '/images/placeholder.png'
): string {
  const url = getImageUrl(imagePath)
  return url || fallback
}
