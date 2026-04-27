<?php

namespace App\Http\Controllers\Api;

use App\Models\Gamme;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class GammeController extends BaseController
{
    public function index(Request $request): JsonResponse
    {
        $gammes = Gamme::orderBy('sort_order')->paginate($request->get('per_page', 10));

        return $this->sendResponse($gammes, 'Gammes retrieved successfully');
    }

    public function show(Gamme $gamme): JsonResponse
    {
        return $this->sendResponse($gamme, 'Gamme retrieved successfully');
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', Gamme::class);

        $validated = $request->validate([
            'name'        => 'required|string|max:255',
            'slug'        => 'required|string|unique:gammes',
            'description' => 'nullable|string',
            'video_url'   => 'nullable', // Can be a file or a string URL
            'photos'      => 'nullable|array',
            'photos.*'    => 'image|mimes:jpeg,png,jpg,gif,webp',
            'images_3d'   => 'nullable|array',
            // Accept files but validate extensions below to avoid strict MIME false-negatives
            'images_3d.*' => 'nullable|file',
            'sort_order'  => 'integer',
            'warranty'    => 'nullable|integer|min:0',
        ]);

        $gamme = new Gamme($validated);

        if ($request->hasFile('cover_image')) {
            $gamme->cover_image = $gamme->saveUploadedImage($request->file('cover_image'));
        } elseif ($request->has('cover_image')) {
            $val = $request->get('cover_image');
            $gamme->cover_image = $val === 'null' ? null : $val;
        }

        if ($request->hasFile('video_url')) {
            $gamme->video_url = $gamme->saveUploadedImage($request->file('video_url'));
        }

        if ($request->hasFile('photos')) {
            $gamme->photos = $gamme->saveUploadedImages($request->file('photos'));
        }

        if ($request->hasFile('images_3d')) {
            // Validate extensions explicitly to accept .glb/.gltf even if MIME is generic
            $allowedExt = ['jpeg','jpg','png','gif','webp','glb','gltf'];
            $files = is_array($request->file('images_3d')) ? $request->file('images_3d') : [$request->file('images_3d')];
            foreach ($files as $f) {
                if ($f && method_exists($f, 'getClientOriginalExtension')) {
                    $ext = strtolower($f->getClientOriginalExtension());
                    if (!in_array($ext, $allowedExt)) {
                        return response()->json([ 'error' => 'Invalid 3D asset extension', 'message' => "Extension .$ext non supportée" ], 422);
                    }
                }
            }

            $gamme->images_3d = $gamme->saveUploadedImages($request->file('images_3d'));
        }

        $gamme->save();

        return $this->sendResponse($gamme, 'Gamme created successfully', 201);
    }

    public function update(Request $request, Gamme $gamme): JsonResponse
    {
        $this->authorize('update', $gamme);

        $validated = $request->validate([
            'name'        => 'string|max:255',
            'slug'        => 'string|unique:gammes,slug,' . $gamme->id,
            'description' => 'nullable|string',
            'video_url'   => 'nullable',
            'photos'      => 'nullable|array',
            'photos.*'    => 'nullable', // Allow both strings (URLs) and Files
            'images_3d'   => 'nullable|array',
            'images_3d.*' => 'nullable', // Allow both strings (URLs) and Files — extension check done manually
            'sort_order'  => 'integer',
            'warranty'    => 'nullable|integer|min:0',
        ]);

        if ($request->hasFile('cover_image')) {
            $gamme->cover_image = $gamme->saveUploadedImage(
                $request->file('cover_image'),
                $gamme->cover_image
            );
        } elseif ($request->has('cover_image')) {
            $val = $request->get('cover_image');
            $gamme->cover_image = ($val === '' || $val === 'null') ? null : $val;
        }

        if ($request->hasFile('video_url')) {
            $validated['video_url'] = $gamme->saveUploadedImage(
                $request->file('video_url'),
                $gamme->video_url
            );
        }

        // --- Handle Photos ---
        $existingPhotosKept = $request->input('photos', []);
        if (!is_array($existingPhotosKept)) $existingPhotosKept = [];
        
        // Find which photos were removed to delete them from disk
        $oldPhotos = $gamme->photos ?? [];
        $removedPhotos = array_diff($oldPhotos, $existingPhotosKept);
        foreach ($removedPhotos as $removedUrl) {
            $gamme->deleteLocalImage($removedUrl);
        }

        $newPhotosUrls = [];
        if ($request->hasFile('photos')) {
            $newPhotosUrls = $gamme->saveUploadedImages($request->file('photos'));
        }
        $validated['photos'] = array_values(array_merge($existingPhotosKept, $newPhotosUrls));


        // --- Handle 3D Images ---
        $existing3dKept = $request->input('images_3d', []);
        if (!is_array($existing3dKept)) $existing3dKept = [];

        // Find which 3d images were removed to delete them from disk
        $old3d = $gamme->images_3d ?? [];
        $removed3d = array_diff($old3d, $existing3dKept);
        foreach ($removed3d as $removedUrl) {
            $gamme->deleteLocalImage($removedUrl);
        }

        $new3dUrls = [];
        if ($request->hasFile('images_3d')) {
            // Validate extensions explicitly for updates
            $allowedExt = ['jpeg','jpg','png','gif','webp','glb','gltf'];
            $files = is_array($request->file('images_3d')) ? $request->file('images_3d') : [$request->file('images_3d')];
            foreach ($files as $f) {
                if ($f && method_exists($f, 'getClientOriginalExtension')) {
                    $ext = strtolower($f->getClientOriginalExtension());
                    if (!in_array($ext, $allowedExt)) {
                        return response()->json([ 'error' => 'Invalid 3D asset extension', 'message' => "Extension .$ext non supportée" ], 422);
                    }
                }
            }

            $new3dUrls = $gamme->saveUploadedImages($request->file('images_3d'));
        }
        $validated['images_3d'] = array_values(array_merge($existing3dKept, $new3dUrls));

        $gamme->fill($validated);
        $gamme->save();

        return $this->sendResponse($gamme, 'Gamme updated successfully');
    }

    public function destroy(Gamme $gamme): JsonResponse
    {
        $this->authorize('delete', $gamme);

        $gamme->delete();

        return $this->sendResponse(null, 'Gamme deleted successfully');
    }

    public function reorder(Request $request): JsonResponse
    {
        $this->authorize('reorder', Gamme::class);

        $validated = $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'required|uuid|exists:gammes,id'
        ]);

        $ids = $validated['ids'];

        \Illuminate\Support\Facades\DB::transaction(function () use ($ids) {
            foreach ($ids as $index => $id) {
                \Illuminate\Support\Facades\DB::table('gammes')
                    ->where('id', $id)
                    ->update(['sort_order' => $index]);
            }
        });

        return $this->sendResponse(null, 'Gammes reordered successfully');
    }
}
