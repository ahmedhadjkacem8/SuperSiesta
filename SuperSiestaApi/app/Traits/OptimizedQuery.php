<?php

namespace App\Traits;

use Illuminate\Database\Eloquent\Builder;

/**
 * Trait for optimizing Eloquent queries with eager loading and pagination
 * Prevents N+1 query problems and improves API response times
 */
trait OptimizedQuery
{
    /**
     * Apply common relations and pagination to a query
     * @param Builder $query
     * @param int $perPage
     * @return \Illuminate\Pagination\LengthAwarePaginator
     */
    public function applyOptimizations(Builder $query, int $perPage = 15)
    {
        // Apply eager loading
        $query = $this->withEagerLoading($query);

        // Apply ordering
        $query = $this->applyOrdering($query);

        // Apply filtering
        $query = $this->applyFilters($query);

        // Paginate results
        return $query->paginate($perPage);
    }

    /**
     * Apply eager loading to prevent N+1 queries
     * Override in controller to specify relations
     */
    protected function withEagerLoading(Builder $query): Builder
    {
        return $query;
    }

    /**
     * Apply default ordering
     * Override in controller for custom ordering
     */
    protected function applyOrdering(Builder $query): Builder
    {
        return $query->latest(); // Most recent first
    }

    /**
     * Apply filters from request
     * Override in controller for custom filters
     */
    protected function applyFilters(Builder $query): Builder
    {
        return $query;
    }

    /**
     * Get pagination metadata for frontend
     */
    public function getPaginationMeta($paginated)
    {
        return [
            'current_page' => $paginated->currentPage(),
            'per_page' => $paginated->perPage(),
            'total' => $paginated->total(),
            'last_page' => $paginated->lastPage(),
            'has_more' => $paginated->hasMorePages(),
        ];
    }
}
