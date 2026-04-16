<?php

namespace App\Http\Controllers\Api;

use App\Models\Quote;
use App\Models\Compteur;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class QuoteController extends BaseController
{
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Quote::class);

        $query = Quote::query();

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('client_id')) {
            $query->where('client_id', $request->client_id);
        }

        $quotes = $query->with('client', 'items')->paginate($request->get('per_page', 15));

        return $this->sendResponse($quotes, 'Quotes retrieved successfully');
    }

    public function show(Quote $quote): JsonResponse
    {
        $this->authorize('view', $quote);

        $quote->load('client', 'items');

        return $this->sendResponse($quote, 'Quote retrieved successfully');
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', Quote::class);

        $validated = $request->validate([
            'quote_number' => 'nullable|string|unique:quotes',
            'client_id' => 'nullable|uuid|exists:clients,id',
            'client_name' => 'nullable|string',
            'status' => 'string|in:créé,envoyé,accepté,refusé,facturé',
            'total' => 'required|numeric|min:0',
            'discount_type' => 'nullable|string|in:percentage,amount',
            'discount_value' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
            'valid_until' => 'nullable|date',
            'items' => 'required|array|min:1',
            'items.*.product_slug' => 'nullable|string',
            'items.*.dimension' => 'nullable|string',
            'items.*.description' => 'required|string',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_price' => 'required|numeric|min:0',
        ]);

        $quote = Quote::create([
            'quote_number' => $validated['quote_number'] ?? Compteur::generateNumber('devis'),
            'client_id' => $validated['client_id'] ?? null,
            'client_name' => $validated['client_name'] ?? null,
            'status' => $validated['status'] ?? 'créé',
            'total' => $validated['total'],
            'discount_type' => $validated['discount_type'] ?? 'amount',
            'discount_value' => $validated['discount_value'] ?? 0,
            'notes' => $validated['notes'] ?? null,
            'valid_until' => $validated['valid_until'] ?? null,
        ]);

        foreach ($validated['items'] as $item) {
            $total = $item['quantity'] * $item['unit_price'];
            $quote->items()->create([
                'product_slug' => $item['product_slug'] ?? null,
                'dimension' => $item['dimension'] ?? null,
                'description' => $item['description'],
                'quantity' => $item['quantity'],
                'unit_price' => $item['unit_price'],
                'total' => $total,
            ]);
        }

        return $this->sendResponse($quote->load('items'), 'Quote created successfully', 201);
    }

    public function update(Request $request, Quote $quote): JsonResponse
    {
        $this->authorize('update', $quote);

        $validated = $request->validate([
            'status' => 'sometimes|string|in:créé,envoyé,accepté,refusé,facturé',
            'total' => 'sometimes|numeric|min:0',
            'discount_type' => 'sometimes|nullable|string|in:percentage,amount',
            'discount_value' => 'sometimes|nullable|numeric|min:0',
            'notes' => 'sometimes|nullable|string',
            'valid_until' => 'sometimes|nullable|date',
        ]);

        if (isset($validated['status'])) {
            $validated['status'] = \Normalizer::normalize($validated['status'], \Normalizer::FORM_C);
        }

        $quote->update($validated);

        return $this->sendResponse($quote, 'Quote updated successfully');
    }

    public function destroy(Quote $quote): JsonResponse
    {
        $this->authorize('delete', $quote);

        $quote->items()->delete();
        $quote->delete();

        return $this->sendResponse(null, 'Quote deleted successfully');
    }

    public function items(Quote $quote): JsonResponse
    {
        $this->authorize('view', $quote);
        return $this->sendResponse($quote->items, 'Quote items retrieved successfully');
    }

    public function nextNumber(): JsonResponse
    {
        return $this->sendResponse(['next_number' => Compteur::getNextNumber('devis')], 'Next quote number retrieved');
    }
}
