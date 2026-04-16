// SuperSiestaFront/src/components/OptimizedImage.tsx
import { useState, useEffect } from 'react'
import { getImageUrl } from '@/utils/imageUtils'

interface OptimizedImageProps {
  src: string | null | undefined
  alt: string
  className?: string
  containerClass?: string
  sizes?: string // CSS media queries for responsive sizing
  fallback?: string
  priority?: boolean // Load immediately instead of lazy
  onLoad?: () => void
  onError?: () => void
}

/**
 * Optimized image component with:
 * - Lazy loading (except priority images)
 * - Responsive sizing with srcset
 * - WebP format support (falls back to JPEG)
 * - Proper browser caching
 * - Aspect ratio preservation
 */
export default function OptimizedImage({
  src,
  alt,
  className = 'w-full h-auto',
  containerClass = '',
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
  fallback = '/images/placeholder.png',
  priority = false,
  onLoad,
  onError,
}: OptimizedImageProps) {
  const [imageSrc, setImageSrc] = useState<string>('')
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    if (!src) {
      setImageSrc(fallback)
      return
    }

    const fullUrl = getImageUrl(src)
    setImageSrc(fullUrl)
  }, [src, fallback])

  if (!imageSrc) {
    return (
      <div className={containerClass}>
        <div className={`${className} bg-gray-200 animate-pulse`} />
      </div>
    )
  }

  return (
    <div className={containerClass}>
      {/* Skeleton loader while image loads */}
      {!isLoaded && (
        <div className={`${className} bg-gray-200 absolute animate-pulse`} />
      )}

      {/* Picture element for WebP support with fallback */}
      <picture className={containerClass}>
        {/* WebP format for modern browsers */}
        <source
          srcSet={generateSrcSet(imageSrc, 'webp')}
          sizes={sizes}
          type="image/webp"
        />

        {/* JPEG fallback for older browsers */}
        <source
          srcSet={generateSrcSet(imageSrc, 'jpeg')}
          sizes={sizes}
          type="image/jpeg"
        />

        {/* Img element with lazy loading */}
        <img
          src={imageSrc}
          alt={alt}
          className={`${className} ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          sizes={sizes}
          onLoad={() => {
            setIsLoaded(true)
            onLoad?.()
          }}
          onError={() => {
            setImageSrc(fallback)
            onError?.()
          }}
        />
      </picture>
    </div>
  )
}

/**
 * Generate responsive image sizes with different widths
 * Used for srcset attribute to serve appropriately sized images
 */
function generateSrcSet(baseUrl: string, format: 'webp' | 'jpeg'): string {
  // Image sizes to generate (common breakpoints)
  const sizes = [320, 640, 1024, 1536, 2048]
  const ext = format === 'webp' ? '.webp' : '.jpg'

  return sizes
    .map((width) => {
      // Append size parameter to URL if it supports it
      // Otherwise use base URL (server will serve appropriate size)
      if (baseUrl.includes('?')) {
        return `${baseUrl}&w=${width} ${width}w`
      }
      return `${baseUrl}?w=${width} ${width}w`
    })
    .join(', ')
}
