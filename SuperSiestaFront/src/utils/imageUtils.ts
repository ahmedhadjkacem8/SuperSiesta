// SuperSiestaFront/src/utils/imageUtils.ts

/**
 * Utilitaires pour gérer les URLs d'images dans l'application
 */

const API_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')

/**
 * Normalise un chemin URL : si c'est une URL absolue, extrait seulement le path.
 * Permet de rendre les URLs DNS-indépendantes.
 */
function toRelativePath(url: string): string {
  try {
    const parsed = new URL(url)
    return parsed.pathname
  } catch {
    return url // déjà relatif
  }
}

/**
 * Convertit une image/vidéo URL en URL publique utilisable dans le navigateur.
 * Toujours domain-independent : fonctionne sur localhost, demo, prod, etc.
 * @param imagePath Chemin relatif ou URL complète de l'image/vidéo
 * @returns URL utilisable dans src={}
 */
export function getImageUrl(imagePath: string | null | undefined): string {
  if (!imagePath) return ''

  // Nettoyer les anciennes URLs avec IP / port 8000 hardcodés en DB
  imagePath = imagePath.replace(/^https?:\/\/[^\/]+:8000/, '')
  imagePath = imagePath.replace(/^http:\/\/135\.125\.202\.39:8000/, '')

  // Si c'est une URL absolue (http/https), extraire uniquement le chemin
  // si elle pointe vers nos dossiers statiques ou contient un port dev
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    const relative = toRelativePath(imagePath)
    if (relative.startsWith('/storage/') || relative.startsWith('/uploads/') || relative.startsWith('/videos/') || relative.startsWith('/images/')) {
      imagePath = relative
    } else if (!imagePath.startsWith('https://')) {
      // Forcer HTTPS pour toute autre URL externe HTTP si la page courante est HTTPS
      if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
        imagePath = imagePath.replace(/^http:\/\//i, 'https://')
      }
    }
  }

  // Chemin relatif vers /storage/, /uploads/, /videos/ ou /images/ → servi directement par Nginx
  if (
    imagePath.startsWith('/storage/') ||
    imagePath.startsWith('/uploads/') ||
    imagePath.startsWith('/videos/') ||
    imagePath.startsWith('/images/')
  ) {
    if (API_URL.startsWith('http://') || API_URL.startsWith('https://')) {
      const base = API_URL.replace(/\/api\/?$/, '')
      return `${base}${imagePath}`
    }
    // VITE_API_URL est un proxy relatif (ex: '/api') → le chemin est servi sur l'origine courante
    return imagePath
  }

  // Par défaut, considère que c'est un nom de fichier seul dans storage
  const cleaned = imagePath.replace(/^\/+/, '')
  if (API_URL.startsWith('http://') || API_URL.startsWith('https://')) {
    const base = API_URL.replace(/\/api\/?$/, '')
    return `${base}/storage/${cleaned}`
  }
  return `/storage/${cleaned}`
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
