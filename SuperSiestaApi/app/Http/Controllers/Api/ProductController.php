<?php

namespace App\Http\Controllers\Api;

use App\Models\Product;
use App\Traits\OptimizedQuery;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Database\Eloquent\Builder;

class ProductController extends BaseController
{
    use OptimizedQuery;

    public function index(Request $request): JsonResponse
    {
        $query = Product::query();

        // Apply filters before optimization
        if ($request->has('categorie')) {
            $query->where('categorie', $request->categorie);
        }
        if ($request->has('fermete')) {
            $query->where('fermete', $request->fermete);
        }
        if ($request->has('gamme')) {
            $query->where('gamme', $request->gamme);
        }
        if ($request->has('in_promo')) {
            $query->where('in_promo', $request->boolean('in_promo'));
        }

        // Apply eager loading for sizes
        $query->with(['sizes', 'freeGifts']);

        // Paginate with default per_page
        $perPage = $request->get('per_page', 15);
        $products = $query->paginate($perPage);

        // Get pagination metadata
        $meta = $this->getPaginationMeta($products);

        return $this->sendResponse([
            'data' => $products->items(),
            'meta' => $meta,
        ], 'Products retrieved successfully');
    }

    public function show(Product $product): JsonResponse
    {
        $product->load(['sizes', 'freeGifts']);

        return $this->sendResponse($product, 'Product retrieved successfully');
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', Product::class);

        $validated = $request->validate([
            'name'        => 'required|string|max:255',
            'slug'        => 'required|string|unique:products',
            'categorie'   => 'required|string',
            'fermete'     => 'required|string',
            'gamme'       => 'nullable|string',
            'image'       => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:204800',
            'new_images'  => 'nullable|array',
            'new_images.*'=> 'image|mimes:jpeg,png,jpg,gif,webp|max:204800',
            'description' => 'nullable|string',
            'specs'       => 'nullable|array',
            'badge'       => 'nullable|string',
            'in_promo'    => 'boolean',
            'grammage'    => 'nullable|integer',
        ]);

        $product = new Product($validated);

        if ($request->hasFile('image')) {
            $product->image = $product->saveUploadedImage($request->file('image'));
        }

        if ($request->hasFile('new_images')) {
            $product->images = $product->saveUploadedImages($request->file('new_images'));
        }

        $product->save();

        return $this->sendResponse($product, 'Product created successfully', 201);
    }

    public function update(Request $request, Product $product): JsonResponse
    {
        $this->authorize('update', $product);

        $validated = $request->validate([
            'name'        => 'string|max:255',
            'slug'        => 'string|unique:products,slug,' . $product->id,
            'categorie'   => 'string',
            'fermete'     => 'string',
            'gamme'       => 'nullable|string',
            'image'       => 'nullable|image|mimes:jpeg,png,jpg,gif,webp',
            'images_present' => 'sometimes|boolean',
            'images'      => 'sometimes|array',
            'images.*'    => 'string',
            'new_images'  => 'nullable|array',
            'new_images.*'=> 'image|mimes:jpeg,png,jpg,gif,webp|max:204800',
            'description' => 'nullable|string',
            'specs'       => 'nullable|array',
            'badge'       => 'nullable|string',
            'in_promo'    => 'boolean',
            'grammage'    => 'nullable|integer',
        ]);

        if ($request->hasFile('image')) {
            $validated['image'] = $product->saveUploadedImage(
                $request->file('image'),
                $product->image
            );
        }

        if ($request->boolean('images_present') || $request->exists('images') || $request->hasFile('new_images')) {
            $storedImages = $product->getRawOriginal('images');
            $storedImages = is_array($storedImages) ? $storedImages : (json_decode($storedImages ?: '[]', true) ?: []);
            $requestedImages = $request->input('images', []);
            $requestedPaths = array_fill_keys(array_map(
                static fn (string $image) => parse_url($image, PHP_URL_PATH) ?: $image,
                $requestedImages
            ), true);

            $keptImages = array_values(array_filter($storedImages, static function ($image) use ($requestedPaths) {
                $path = parse_url($image, PHP_URL_PATH) ?: $image;
                return isset($requestedPaths[$path]);
            }));

            foreach (array_diff($storedImages, $keptImages) as $removedImage) {
                $path = parse_url($removedImage, PHP_URL_PATH) ?: $removedImage;
                if (str_starts_with($path, '/storage/products/') || str_starts_with($path, '/uploads/products/')) {
                    $product->deleteLocalImage($removedImage);
                }
            }

            $newImages = $request->hasFile('new_images')
                ? $product->saveUploadedImages($request->file('new_images'))
                : [];

            $validated['images'] = array_values(array_merge($keptImages, $newImages));
        }
        unset($validated['images_present'], $validated['new_images']);

        $product->update($validated);

        return $this->sendResponse($product, 'Product updated successfully');
    }

    public function destroy(Product $product): JsonResponse
    {
        $this->authorize('delete', $product);

        $product->delete();

        return $this->sendResponse(null, 'Product deleted successfully');
    }

    /**
     * Synchroniser les offres gratuites associées au produit
     */
    public function syncFreeGifts(Request $request, Product $product): JsonResponse
    {
        $this->authorize('update', $product);

        $validated = $request->validate([
            'free_gift_ids' => 'nullable|array',
            'free_gift_ids.*' => 'exists:free_gifts,id',
        ]);

        $product->freeGifts()->sync($validated['free_gift_ids'] ?? []);

        $product->load('freeGifts');
        return $this->sendResponse($product, 'Free gifts synchronized successfully');
    }
}
