<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SeoMeta;
use App\Models\SeoScoreHistory;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class SeoController extends Controller
{
    /**
     * List all SEO entries (raw array, no pagination wrapper).
     * Bug fix: was returning a paginated object; frontend expects a plain array.
     */
    public function index(Request $request): JsonResponse
    {
        $query = SeoMeta::query();

        // Filter by type
        if ($request->has('type')) {
            if ($request->type === 'static') {
                $query->staticPages();
            } elseif ($request->type === 'entity') {
                $query->entityPages();
            }
        }

        // Filter by active status
        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        // Search
        if ($request->filled('q')) {
            $search = $request->q;
            $query->where(function ($q) use ($search) {
                $q->where('page_identifier', 'LIKE', "%{$search}%")
                  ->orWhere('page_label', 'LIKE', "%{$search}%")
                  ->orWhere('meta_title', 'LIKE', "%{$search}%")
                  ->orWhere('meta_keywords', 'LIKE', "%{$search}%");
            });
        }

        // Sort
        $sortBy  = $request->get('sort', 'updated_at');
        $sortDir = $request->get('dir', 'desc');
        $query->orderBy($sortBy, $sortDir);

        // Return as plain array (not paginated) — fixes frontend compatibility
        return response()->json($query->get());
    }

    /**
     * Get a single SEO entry.
     */
    public function show($id): JsonResponse
    {
        $seo = SeoMeta::findOrFail($id);
        return response()->json($seo);
    }

    /**
     * Create a new SEO entry.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'page_identifier' => 'required|string|max:100|unique:seo_metas,page_identifier',
            'page_label'      => 'nullable|string|max:255',
            'seoable_type'    => 'nullable|string',
            'seoable_id'      => 'nullable|string|max:36',
            'meta_title'      => 'nullable|string|max:70',
            'meta_description'=> 'nullable|string|max:160',
            'meta_keywords'   => 'nullable|string',
            'meta_robots'     => 'nullable|string|max:100',
            'og_title'        => 'nullable|string|max:95',
            'og_description'  => 'nullable|string|max:200',
            'og_image'        => 'nullable|string',
            'og_type'         => 'nullable|string|max:50',
            'og_locale'       => 'nullable|string|max:10',
            'twitter_card'    => 'nullable|string|max:20',
            'twitter_title'   => 'nullable|string|max:70',
            'twitter_description' => 'nullable|string|max:200',
            'twitter_image'   => 'nullable|string',
            'json_ld_type'    => 'nullable|string|max:50',
            'json_ld_data'    => 'nullable|array',
            'priority'        => 'nullable|numeric|min:0|max:1',
            'changefreq'      => 'nullable|string|max:20',
            'is_active'       => 'nullable|boolean',
            'notes'           => 'nullable|string',
        ]);

        $seo = SeoMeta::create($validated);
        $seo->calculateScore();

        return response()->json($seo, 201);
    }

    /**
     * Update an existing SEO entry.
     */
    public function update(Request $request, $id): JsonResponse
    {
        $seo = SeoMeta::findOrFail($id);

        $validated = $request->validate([
            'page_identifier' => 'sometimes|string|max:100|unique:seo_metas,page_identifier,' . $id,
            'page_label'      => 'nullable|string|max:255',
            'seoable_type'    => 'nullable|string',
            'seoable_id'      => 'nullable|string|max:36',
            'meta_title'      => 'nullable|string|max:70',
            'meta_description'=> 'nullable|string|max:160',
            'meta_keywords'   => 'nullable|string',
            'meta_robots'     => 'nullable|string|max:100',
            'og_title'        => 'nullable|string|max:95',
            'og_description'  => 'nullable|string|max:200',
            'og_image'        => 'nullable|string',
            'og_type'         => 'nullable|string|max:50',
            'og_locale'       => 'nullable|string|max:10',
            'twitter_card'    => 'nullable|string|max:20',
            'twitter_title'   => 'nullable|string|max:70',
            'twitter_description' => 'nullable|string|max:200',
            'twitter_image'   => 'nullable|string',
            'json_ld_type'    => 'nullable|string|max:50',
            'json_ld_data'    => 'nullable|array',
            'priority'        => 'nullable|numeric|min:0|max:1',
            'changefreq'      => 'nullable|string|max:20',
            'is_active'       => 'nullable|boolean',
            'notes'           => 'nullable|string',
        ]);

        $seo->update($validated);
        $seo->calculateScore();

        return response()->json($seo->fresh());
    }

    /**
     * Delete an SEO entry.
     */
    public function destroy($id): JsonResponse
    {
        $seo = SeoMeta::findOrFail($id);
        $seo->delete();
        return response()->json(null, 204);
    }

    /**
     * Recalculate the SEO score for a single entry.
     */
    public function analyze($id): JsonResponse
    {
        $seo   = SeoMeta::findOrFail($id);
        $score = $seo->calculateScore();

        return response()->json([
            'id'               => $seo->id,
            'seo_score'        => $score,
            'last_analyzed_at' => $seo->last_analyzed_at,
            'recommendations'  => $seo->recommendations ?? [],
        ]);
    }

    /**
     * Bulk-analyze all (or a subset of) SEO entries in a single request.
     * Replaces the sequential per-entry loop that was previously done on the frontend.
     */
    public function analyzeBulk(Request $request): JsonResponse
    {
        $ids = $request->input('ids', []);

        $query = SeoMeta::query();
        if (!empty($ids)) {
            $query->whereIn('id', $ids);
        }

        $entries = $query->get();
        $results = [];

        foreach ($entries as $seo) {
            $score    = $seo->calculateScore();
            $results[] = [
                'id'               => $seo->id,
                'seo_score'        => $score,
                'last_analyzed_at' => $seo->last_analyzed_at,
                'recommendations'  => $seo->recommendations ?? [],
            ];
        }

        return response()->json([
            'analyzed' => count($results),
            'results'  => $results,
        ]);
    }

    /**
     * Trigger a full (or partial) re-sync of auto-managed JSON-LD entries.
     * Runs the seo:sync-all Artisan command synchronously.
     * Restrict to a type via the optional 'type' body param.
     */
    public function resync(Request $request): JsonResponse
    {
        $type  = $request->input('type'); // products | categories | showrooms | blog
        $force = (bool) $request->input('force', false);

        try {
            $params = [];
            if ($force) {
                $params['--force'] = true;
            }
            if ($type) {
                $params['--type'] = $type;
            }

            \Artisan::call('seo:sync-all', $params);
            $output = \Artisan::output();

            // Reload fresh stats
            $synced = SeoMeta::count();

            return response()->json([
                'success' => true,
                'synced'  => $synced,
                'output'  => trim($output),
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get global SEO statistics.
     * Bug fix: ungrouped whereNull()->orWhere() was breaking the active() scope.
     */
    public function stats(): JsonResponse
    {
        $total    = SeoMeta::count();
        $active   = SeoMeta::active()->count();
        $avgScore = (int) SeoMeta::active()->avg('seo_score');

        // Bug fix: wrap orWhere in a closure to keep it scoped correctly
        $noTitle = SeoMeta::active()
            ->where(function ($q) {
                $q->whereNull('meta_title')->orWhere('meta_title', '');
            })->count();

        $noDescription = SeoMeta::active()
            ->where(function ($q) {
                $q->whereNull('meta_description')->orWhere('meta_description', '');
            })->count();

        $noKeywords = SeoMeta::active()
            ->where(function ($q) {
                $q->whereNull('meta_keywords')->orWhere('meta_keywords', '');
            })->count();

        $noOgImage = SeoMeta::active()
            ->where(function ($q) {
                $q->whereNull('og_image')->orWhere('og_image', '');
            })->count();

        $scoreDistribution = [
            'excellent' => SeoMeta::active()->where('seo_score', '>=', 80)->count(),
            'good'      => SeoMeta::active()->whereBetween('seo_score', [50, 79])->count(),
            'poor'      => SeoMeta::active()->where('seo_score', '<', 50)->count(),
        ];

        $topPages = SeoMeta::active()
            ->orderByDesc('seo_score')
            ->limit(5)
            ->get(['id', 'page_identifier', 'page_label', 'meta_title', 'seo_score', 'last_analyzed_at']);

        $worstPages = SeoMeta::active()
            ->orderBy('seo_score')
            ->limit(5)
            ->get(['id', 'page_identifier', 'page_label', 'meta_title', 'seo_score', 'last_analyzed_at']);

        return response()->json([
            'total'              => $total,
            'active'             => $active,
            'avg_score'          => $avgScore,
            'missing'            => [
                'title'       => $noTitle,
                'description' => $noDescription,
                'keywords'    => $noKeywords,
                'og_image'    => $noOgImage,
            ],
            'score_distribution' => $scoreDistribution,
            'top_pages'          => $topPages,
            'worst_pages'        => $worstPages,
        ]);
    }

    /**
     * Get recent score history for a specific SEO entry (for trend charts).
     */
    public function scoreHistory($id): JsonResponse
    {
        $seo = SeoMeta::findOrFail($id);

        $history = SeoScoreHistory::where('seo_meta_id', $seo->id)
            ->orderByDesc('created_at')
            ->limit(30)
            ->get(['score', 'created_at']);

        return response()->json([
            'id'      => $seo->id,
            'history' => $history,
        ]);
    }

    /**
     * Public endpoint: get SEO meta for a specific page identifier.
     * Bug fix: was using non-existent scopeForPage → uses correct scopePageIdentifier.
     */
    public function getByPage(string $identifier): JsonResponse
    {
        // Bug fix: forPage() scope did not exist — use pageIdentifier() scope
        $seo = SeoMeta::active()->pageIdentifier($identifier)->first();

        if (!$seo) {
            // Try global fallback
            $seo = SeoMeta::active()->pageIdentifier('global')->first();
        }

        if (!$seo) {
            return response()->json(null, 404);
        }

        return response()->json($seo->getResolvedMeta());
    }
}
