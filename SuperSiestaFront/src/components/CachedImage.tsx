// SuperSiestaFront/src/components/CachedImage.tsx
import { useState, useEffect, useMemo, useCallback } from 'react'

interface CachedImageProps {
  src: string
  alt: string
  className?: string
  fallback?: string
  onLoad?: () => void
  onError?: () => void
  loading?: "lazy" | "eager"
  fetchPriority?: "high" | "low" | "auto"
}

/**
 * Composant Image simplifié qui charge les images directement.
 */
export default function CachedImage({
  src,
  alt,
  className,
  fallback,
  onLoad,
  onError,
  loading = "lazy",
  fetchPriority = "auto",
}: CachedImageProps) {
  const [imageSrc, setImageSrc] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)

  // Détermine si c'est une image publique ou via API
  const isPublicFile = useMemo(() => {
    if (!src) return false
    // Les fichiers publics commencent par / ou /uploads/
    return src.startsWith('/uploads') || (src.startsWith('http') && src.includes('/uploads/'))
  }, [src])

  useEffect(() => {
    if (!src) {
      console.warn('[CachedImage] No src provided');
      setImageSrc(fallback || '')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setImageSrc(src)
    setIsLoading(false)
  }, [src, fallback])

  const handleLoad = useCallback(() => {
    setIsLoading(false)
    onLoad?.()
  }, [onLoad])

  const handleError = useCallback(() => {
    console.error(`[CachedImage] Failed to load: ${src}`)
    setImageSrc(fallback || '')
    onError?.()
  }, [src, fallback, onError])

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={className}
      onLoad={handleLoad}
      onError={handleError}
      loading={loading}
      referrerPolicy="no-referrer"
      crossOrigin={isPublicFile ? undefined : "anonymous"}
      {...({ fetchpriority: fetchPriority } as any)}
      decoding="async"
    />
  )
}
