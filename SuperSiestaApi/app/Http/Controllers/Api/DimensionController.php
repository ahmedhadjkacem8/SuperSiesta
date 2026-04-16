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
        $dimensions = Dimension::orderBy('label', 'asc')->get();
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
        ]);

        $dimension = Dimension::create($validated);

        return $this->sendResponse($dimension, 'Dimension created successfully', 201);
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
        ]);

        $dimension->update($validated);

        return $this->sendResponse($dimension, 'Dimension updated successfully');
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
