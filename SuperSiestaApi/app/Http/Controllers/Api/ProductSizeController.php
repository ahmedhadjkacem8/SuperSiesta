<?php

namespace App\Http\Controllers\Api;

use App\Models\ProductSize;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class ProductSizeController extends BaseController
{
    public function index(Product $product): JsonResponse
    {
        $sizes = $product->sizes()->get();

        return $this->sendResponse($sizes, 'Product sizes retrieved successfully');
    }

    public function store(Request $request, Product $product): JsonResponse
    {
        $this->authorize('create', ProductSize::class);

        $validated = $request->validate([
            'label' => 'required|string|unique:product_sizes,label,NULL,id,product_id,' . $product->id,
            'price' => 'required|numeric|min:0',
            'reseller_price' => 'nullable|numeric|min:0',
            'original_price' => 'nullable|numeric|min:0',
        ]);

        $validated['product_id'] = $product->id;
        $size = ProductSize::create($validated);

        return $this->sendResponse($size, 'Product size created successfully', 201);
    }

    public function update(Request $request, Product $product, ProductSize $size): JsonResponse
    {
        $this->authorize('update', $size);

        $validated = $request->validate([
            'label' => 'string|unique:product_sizes,label,' . $size->id . ',id,product_id,' . $product->id,
            'price' => 'numeric|min:0',
            'reseller_price' => 'nullable|numeric|min:0',
            'original_price' => 'nullable|numeric|min:0',
        ]);

        $size->update($validated);

        return $this->sendResponse($size, 'Product size updated successfully');
    }

    public function destroy(Product $product, ProductSize $size): JsonResponse
    {
        $this->authorize('delete', $size);

        $size->delete();

        return $this->sendResponse(null, 'Product size deleted successfully');
    }
}
