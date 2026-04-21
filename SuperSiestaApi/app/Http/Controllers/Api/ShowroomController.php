<?php

namespace App\Http\Controllers\Api;

use App\Models\Showroom;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class ShowroomController extends BaseController
{
    public function index(Request $request): JsonResponse
    {
        $showrooms = Showroom::orderBy('sort_order')->paginate($request->get('per_page', 10));

        return $this->sendResponse($showrooms, 'Showrooms retrieved successfully');
    }

    public function show(Showroom $showroom): JsonResponse
    {
        return $this->sendResponse($showroom, 'Showroom retrieved successfully');
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', Showroom::class);

        $validated = $request->validate([
            'name'                  => 'required|string|max:255',
            'responsible_name'      => 'nullable|string|max:255',
            'responsible_phone'     => 'nullable|string|max:20',
            'responsible_email'     => 'nullable|email',
            'contact_person_name'   => 'nullable|string|max:255',
            'contact_person_phone'  => 'nullable|string|max:20',
            'contact_person_email'  => 'nullable|email',
            'address'               => 'required|string',
            'city'                  => 'required|string|max:100',
            'phone'                 => 'nullable|string|max:20',
            'email'                 => 'nullable|email',
            'lat'                   => 'nullable|numeric',
            'lng'                   => 'nullable|numeric',
            'image_url'             => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:204800',
            'images'                => 'nullable|array',
            'images.*'              => 'image|mimes:jpeg,png,jpg,gif,webp|max:204800',
            'opening_hours'         => 'nullable|string',
            'opening_hours_from'    => 'nullable|string',
            'opening_hours_until'   => 'nullable|string',
            'opening_days'          => 'nullable',
            'google_maps_url'       => 'nullable|string',
            'sort_order'            => 'integer',
        ]);

        $showroom = new Showroom($request->except('opening_days'));
        $days = $request->input('opening_days');
        $showroom->opening_days = is_string($days) ? json_decode($days, true) : $days;

        if ($request->hasFile('image_url')) {
            $showroom->image_url = $showroom->saveUploadedImage($request->file('image_url'));
        }

        if ($request->hasFile('images')) {
            $showroom->images = $showroom->saveUploadedImages($request->file('images'));
        }

        $showroom->save();

        return $this->sendResponse($showroom, 'Showroom created successfully', 201);
    }

    public function update(Request $request, Showroom $showroom): JsonResponse
    {
        $this->authorize('update', $showroom);

        $request->validate([
            'name'                  => 'string|max:255',
            'responsible_name'      => 'nullable|string|max:255',
            'responsible_phone'     => 'nullable|string|max:20',
            'responsible_email'     => 'nullable|email',
            'contact_person_name'   => 'nullable|string|max:255',
            'contact_person_phone'  => 'nullable|string|max:20',
            'contact_person_email'  => 'nullable|email',
            'address'               => 'string',
            'city'                  => 'string|max:100',
            'phone'                 => 'nullable|string|max:20',
            'email'                 => 'nullable|email',
            'lat'                   => 'nullable|numeric',
            'lng'                   => 'nullable|numeric',
            'image_url'             => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:204800',
            'images'                => 'nullable|array',
            'images.*'              => 'image|mimes:jpeg,png,jpg,gif,webp|max:204800',
            'opening_hours'         => 'nullable|string',
            'opening_hours_from'    => 'nullable|string',
            'opening_hours_until'   => 'nullable|string',
            'opening_days'          => 'nullable',
            'google_maps_url'       => 'nullable|string',
            'sort_order'            => 'integer',
        ]);

        $showroom->fill($request->except('opening_days'));
        
        if ($request->has('opening_days')) {
            $days = $request->input('opening_days');
            $showroom->opening_days = is_string($days) ? json_decode($days, true) : $days;
        }

        if ($request->hasFile('image_url')) {
            $showroom->image_url = $showroom->saveUploadedImage(
                $request->file('image_url'),
                $showroom->image_url
            );
        }

        // Allow clearing contact/responsible fields: if present and empty string, set to null
        if ($request->has('contact_person_name')) {
            $showroom->contact_person_name = $request->input('contact_person_name') === '' ? null : $request->input('contact_person_name');
        }
        if ($request->has('contact_person_phone')) {
            $showroom->contact_person_phone = $request->input('contact_person_phone') === '' ? null : $request->input('contact_person_phone');
        }
        if ($request->has('responsible_name')) {
            $showroom->responsible_name = $request->input('responsible_name') === '' ? null : $request->input('responsible_name');
        }
        if ($request->has('responsible_phone')) {
            $showroom->responsible_phone = $request->input('responsible_phone') === '' ? null : $request->input('responsible_phone');
        }
        if ($request->has('responsible_email')) {
            $showroom->responsible_email = $request->input('responsible_email') === '' ? null : $request->input('responsible_email');
        }

        if ($request->has('remove_images')) {
            $toRemove = is_string($request->remove_images) ? json_decode($request->remove_images, true) : $request->remove_images;
            if (is_array($toRemove)) {
                $currentImages = $showroom->images ?? [];
                
                // Effective deletion from disk
                foreach ($toRemove as $url) {
                    $showroom->deleteLocalImage($url);
                }

                // Filtering the array to keep only what's not removed
                $keep = [];
                foreach ($currentImages as $existingUrl) {
                    if (is_string($existingUrl) && !in_array($existingUrl, $toRemove)) {
                        $keep[] = $existingUrl;
                    }
                }
                $showroom->images = $keep;
            }
        }

        if ($request->hasFile('images')) {
            $newImages = $showroom->saveUploadedImages($request->file('images'));
            $showroom->images = array_merge($showroom->images ?? [], $newImages);
        }

        $showroom->save();

        return $this->sendResponse($showroom, 'Showroom updated successfully');
    }

    public function destroy(Showroom $showroom): JsonResponse
    {
        $this->authorize('delete', $showroom);

        $showroom->delete();

        return $this->sendResponse(null, 'Showroom deleted successfully');
    }
}
