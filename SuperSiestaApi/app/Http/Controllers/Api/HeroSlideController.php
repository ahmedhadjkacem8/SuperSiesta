<?php

namespace App\Http\Controllers\Api;

use App\Models\HeroSlide;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class HeroSlideController extends BaseController
{
    public function index(Request $request): JsonResponse
    {
        $slides = HeroSlide::where('active', true)
            ->orderBy('sort_order')
            ->get();

        return $this->sendResponse($slides, 'Hero slides retrieved successfully');
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', HeroSlide::class);

        $validated = $request->validate([
            'title'      => 'nullable|string|max:255',
            'subtitle'   => 'nullable|string',
            'cta_text'   => 'nullable|string|max:100',
            'cta_link'   => 'nullable|string',
            'image_url'  => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:204800',
            'sort_order' => 'integer',
            'active'     => 'boolean',
        ]);

        // Convert empty strings to null for nullable fields
        foreach (['title', 'subtitle', 'cta_text', 'cta_link'] as $field) {
            if (isset($validated[$field]) && $validated[$field] === '') {
                $validated[$field] = null;
            }
        }

        $slide = new HeroSlide($validated);
        $slide->image_url = $slide->saveUploadedImage($request->file('image_url'));
        $slide->save();
        $slide->refresh(); // Ensure we return fresh data

        return $this->sendResponse($slide, 'Hero slide created successfully', 201);
    }

    public function update(Request $request, HeroSlide $slide): JsonResponse
    {
        $this->authorize('update', $slide);

        $validated = $request->validate([
            'title'      => 'nullable|string|max:255',
            'subtitle'   => 'nullable|string',
            'cta_text'   => 'nullable|string|max:100',
            'cta_link'   => 'nullable|string',
            'image_url'  => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:204800',
            'sort_order' => 'integer',
            'active'     => 'boolean',
        ]);

        // Handle image upload if present
        if ($request->hasFile('image_url')) {
            $validated['image_url'] = $slide->saveUploadedImage(
                $request->file('image_url'),
                $slide->image_url
            );
        }

        // Convert empty strings to null for nullable fields
        foreach (['title', 'subtitle', 'cta_text', 'cta_link'] as $field) {
            if (isset($validated[$field]) && $validated[$field] === '') {
                $validated[$field] = null;
            }
        }

        // Perform the update
        $slide->update($validated);
        
        // Reload and ensure data is fresh
        $slide->refresh();

        return $this->sendResponse($slide, 'Hero slide updated successfully');
    }

    public function show(HeroSlide $slide): JsonResponse
    {
        return $this->sendResponse($slide, 'Hero slide retrieved successfully');
    }

    public function destroy(HeroSlide $slide): JsonResponse
    {
        $this->authorize('delete', $slide);

        $slide->delete();

        return $this->sendResponse(null, 'Hero slide deleted successfully');
    }
}
