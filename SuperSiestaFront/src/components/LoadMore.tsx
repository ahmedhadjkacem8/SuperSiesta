// SuperSiestaFront/src/components/LoadMore.tsx
import { Loader2 } from 'lucide-react'

interface LoadMoreProps {
  hasMore: boolean
  isLoading: boolean
  onLoadMore: () => void
  label?: string
  className?: string
}

/**
 * Load More button for paginated/infinite scroll lists
 * Shows loading spinner while fetching next page
 */
export default function LoadMore({
  hasMore,
  isLoading,
  onLoadMore,
  label = 'Load More',
  className = '',
}: LoadMoreProps) {
  if (!hasMore) {
    return null
  }

  return (
    <div className={`flex justify-center py-8 ${className}`}>
      <button
        onClick={onLoadMore}
        disabled={isLoading}
        className="
          px-6 py-3 
          bg-primary text-primary-foreground 
          rounded-lg font-semibold
          hover:bg-primary/90
          disabled:opacity-50 disabled:cursor-not-allowed
          flex items-center gap-2
          transition-colors
        "
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
        {isLoading ? 'Loading...' : label}
      </button>
    </div>
  )
}
