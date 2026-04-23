<?php

namespace App\Http\Controllers\Api;

use App\Models\Dimension;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class DimensionController extends BaseController
{
    /**
     * Display a listing of the resource.
     */
    public function index(): JsonResponse
    {
        // Order by explicit admin sort_order first, then fallback to label
        $dimensions = Dimension::with('freeGifts')->orderBy('sort_order', 'asc')->orderBy('label', 'asc')->get();
        return $this->sendResponse($dimensions, 'Dimensions retrieved successfully');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', Dimension::class);

        $validated = $request->validate([
            'label' => 'required|string|unique:dimensions|max:100',
            'is_standard' => 'boolean',
            'free_gift_ids' => 'nullable|array',
            'free_gift_ids.*' => 'exists:free_gifts,id',
        ]);

        // Assign next available sort_order if not provided
        if (!array_key_exists('sort_order', $validated)) {
            $max = Dimension::max('sort_order') ?? 0;
            $validated['sort_order'] = $max + 1;
        }

        $dimension = Dimension::create($validated);

        if ($request->has('free_gift_ids')) {
            $dimension->freeGifts()->sync($validated['free_gift_ids']);
        }

        return $this->sendResponse($dimension->load('freeGifts'), 'Dimension created successfully', 201);
    }

    /**
     * Reorder dimensions (admin)
     */
    public function reorder(Request $request): JsonResponse
    {
        $this->authorize('reorder', Dimension::class);

        $validated = $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'required|uuid|exists:dimensions,id'
        ]);

        $ids = $validated['ids'];

        \Illuminate\Support\Facades\DB::transaction(function () use ($ids) {
            foreach ($ids as $index => $id) {
                \Illuminate\Support\Facades\DB::table('dimensions')
                    ->where('id', $id)
                    ->update(['sort_order' => $index]);
            }
        });

        return $this->sendResponse(null, 'Order updated');
    }

    /**
     * Display the specified resource.
     */
    public function show(Dimension $dimension): JsonResponse
    {
        return $this->sendResponse($dimension, 'Dimension retrieved successfully');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Dimension $dimension): JsonResponse
    {
        $this->authorize('update', $dimension);

        $validated = $request->validate([
            'label' => 'required|string|unique:dimensions,label,' . $dimension->id . '|max:100',
            'is_standard' => 'boolean',
            'free_gift_ids' => 'nullable|array',
            'free_gift_ids.*' => 'exists:free_gifts,id',
        ]);

        $dimension->update($validated);

        if ($request->has('free_gift_ids')) {
            $dimension->freeGifts()->sync($validated['free_gift_ids']);
        }

        return $this->sendResponse($dimension->load('freeGifts'), 'Dimension updated successfully');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Dimension $dimension): JsonResponse
    {
        $this->authorize('delete', $dimension);

        $dimension->delete();

        return $this->sendResponse(null, 'Dimension deleted successfully');
    }
}
