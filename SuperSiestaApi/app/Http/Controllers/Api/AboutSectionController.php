<?php

namespace App\Http\Controllers\Api;

use App\Models\AboutSection;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class AboutSectionController extends BaseController
{
    public function index(): JsonResponse
    {
        $sections = AboutSection::orderBy('sort_order')->get();
        return $this->sendResponse($sections, 'About sections retrieved successfully');
    }

    public function store(Request $request): JsonResponse
    {
        // Decode JSON items if sent via FormData
        if ($request->has('items') && is_string($request->items)) {
            $request->merge(['items' => json_decode($request->items, true)]);
        }

        // Handle boolean string from FormData
        if ($request->has('is_active')) {
            $request->merge(['is_active' => filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN)]);
        }

        $validated = $request->validate([
            'type'        => 'required|string',
            'title'       => 'nullable|string|max:255',
            'subtitle'    => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'image_url'   => 'nullable|image|max:204800',
            'items'       => 'nullable|array',
            'sort_order'  => 'integer',
            'is_active'   => 'boolean'
        ]);

        $section = new AboutSection($validated);

        if ($request->hasFile('image_url')) {
            $section->image_url = $section->saveUploadedImage($request->file('image_url'));
        }

        $section->save();

        return $this->sendResponse($section, 'Section created successfully', 201);
    }

    public function update(Request $request, AboutSection $aboutSection): JsonResponse
    {
        // Decode JSON items if sent via FormData
        if ($request->has('items') && is_string($request->items)) {
            $request->merge(['items' => json_decode($request->items, true)]);
        }

        // Handle boolean string from FormData
        if ($request->has('is_active')) {
            $request->merge(['is_active' => filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN)]);
        }

        $validated = $request->validate([
            'type'        => 'required|string',
            'title'       => 'nullable|string|max:255',
            'subtitle'    => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'image_url'   => 'nullable|image|max:204800',
            'items'       => 'nullable|array',
            'sort_order'  => 'integer',
            'is_active'   => 'boolean'
        ]);

        if ($request->hasFile('image_url')) {
            $validated['image_url'] = $aboutSection->saveUploadedImage(
                $request->file('image_url'),
                $aboutSection->image_url
            );
        }

        $aboutSection->update($validated);

        return $this->sendResponse($aboutSection, 'Section updated successfully');
    }

    public function destroy(AboutSection $aboutSection): JsonResponse
    {
        $aboutSection->delete();
        return $this->sendResponse(null, 'Section deleted successfully');
    }

    public function reorder(Request $request): JsonResponse
    {
        $request->validate([
            'ids' => 'required|array'
        ]);

        $ids = $request->ids;

        DB::transaction(function () use ($ids) {
            foreach ($ids as $index => $id) {
                DB::table('about_sections')
                    ->where('id', (int)$id)
                    ->update(['sort_order' => $index]);
            }
        });

        return $this->sendResponse(null, 'Sections reordered successfully');
    }
}
