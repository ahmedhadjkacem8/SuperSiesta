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

  // Si c'est déjà une URL complète
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath
  }

  // Si c'est un chemin relatif vers API
  if (imagePath.startsWith('/uploads') || imagePath.startsWith('/storage')) {
    return `${API_URL}${imagePath}`
  }

  // Par défaut, considère que c'est un chemin relatif
  return `${API_URL}/storage/${imagePath}`
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
