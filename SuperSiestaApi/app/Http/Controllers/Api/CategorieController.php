<?php

namespace App\Http\Controllers\Api;

use App\Models\Categorie;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class CategorieController extends BaseController
{
    public function index(): JsonResponse
    {
        $categories = Categorie::orderBy('sort_order', 'asc')->get();
        return $this->sendResponse($categories, 'Categories retrieved successfully');
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', Categorie::class);

        $validated = $request->validate([
            'label' => 'required|string|unique:categories|max:100',
            'description' => 'nullable|string|max:255',
            'color' => 'nullable|string|max:50',
            'text_color' => 'nullable|string|max:50',
        ]);

        $category = new Categorie($validated);
        
        if ($request->hasFile('image')) {
            $category->image = $category->saveUploadedImage($request->file('image'));
        } elseif ($request->has('image')) {
            $val = $request->get('image');
            $category->image = $val === 'null' ? null : $val;
        }
        
        $category->save();
        return $this->sendResponse($category, 'Category created successfully', 201);
    }

    public function show(Categorie $categorie): JsonResponse
    {
        return $this->sendResponse($categorie, 'Category retrieved successfully');
    }

    public function update(Request $request, Categorie $categorie): JsonResponse
    {
        $this->authorize('update', $categorie);

        $validated = $request->validate([
            'label' => 'required|string|unique:categories,label,' . $categorie->id . '|max:100',
            'description' => 'nullable|string|max:255',
            'color' => 'nullable|string|max:50',
            'text_color' => 'nullable|string|max:50',
        ]);

        $categorie->fill($validated);

        if ($request->hasFile('image')) {
            $categorie->image = $categorie->saveUploadedImage(
                $request->file('image'),
                $categorie->image
            );
        } elseif ($request->has('image')) {
            $val = $request->get('image');
            $categorie->image = ($val === '' || $val === 'null') ? null : $val;
        }

        $categorie->save();
        return $this->sendResponse($categorie, 'Category updated successfully');
    }

    public function destroy(Categorie $categorie): JsonResponse
    {
        $this->authorize('delete', $categorie);

        $categorie->delete();
        return $this->sendResponse(null, 'Category deleted successfully');
    }

    /**
     * Reorder categories (admin)
     */
    public function reorder(Request $request): JsonResponse
    {
        $this->authorize('reorder', Categorie::class);

        $validated = $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'required|uuid|exists:categories,id'
        ]);

        $ids = $validated['ids'];

        \Illuminate\Support\Facades\DB::transaction(function () use ($ids) {
            foreach ($ids as $index => $id) {
                \Illuminate\Support\Facades\DB::table('categories')
                    ->where('id', $id)
                    ->update(['sort_order' => $index]);
            }
        });

        return $this->sendResponse(null, 'Categories reordered successfully');
    }
}
