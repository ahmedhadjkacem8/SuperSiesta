<?php

namespace App\Http\Controllers\Api;

use App\Models\FreeGift;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class FreeGiftController extends BaseController
{
    /**
     * Récupérer toutes les offres gratuites
     */
    public function index(): JsonResponse
    {
        $freeGifts = FreeGift::with('dimensions', 'products')->orderBy('titre', 'asc')->get();
        return $this->sendResponse($freeGifts, 'Free gifts retrieved successfully');
    }

    /**
     * Créer une nouvelle offre gratuite
     */
    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', FreeGift::class);

        $validated = $request->validate([
            'titre' => 'required|string|max:255',
            'description' => 'nullable|string',
            'poids' => 'required|integer|min:0',
            'product_ids' => 'nullable|array',
            'product_ids.*' => 'exists:products,id',
            'dimension_ids' => 'nullable|array',
            'dimension_ids.*' => 'exists:dimensions,id',
        ]);

        $freeGift = new FreeGift([
            'titre' => $validated['titre'],
            'description' => $validated['description'] ?? null,
            'poids' => $validated['poids'],
        ]);

        if ($request->hasFile('image')) {
            $freeGift->image = $freeGift->saveUploadedImage($request->file('image'));
        }

        $freeGift->save();

        // Attacher les dimensions
        if (!empty($validated['dimension_ids'])) {
            $freeGift->dimensions()->attach($validated['dimension_ids']);
        }

        $freeGift->load('products', 'dimensions');
        return $this->sendResponse($freeGift, 'Free gift created successfully', 201);
    }

    /**
     * Afficher une offre gratuite spécifique
     */
    public function show(FreeGift $freeGift): JsonResponse
    {
        $freeGift->load('products', 'dimensions');
        return $this->sendResponse($freeGift, 'Free gift retrieved successfully');
    }

    /**
     * Mettre à jour une offre gratuite
     */
    public function update(Request $request, FreeGift $freeGift): JsonResponse
    {
        $this->authorize('update', $freeGift);

        $validated = $request->validate([
            'titre' => 'required|string|max:255',
            'description' => 'nullable|string',
            'poids' => 'required|integer|min:0',
            'product_ids' => 'nullable|array',
            'product_ids.*' => 'exists:products,id',
            'dimension_ids' => 'nullable|array',
            'dimension_ids.*' => 'exists:dimensions,id',
        ]);

        $freeGift->fill([
            'titre' => $validated['titre'],
            'description' => $validated['description'] ?? null,
            'poids' => $validated['poids'],
        ]);

        if ($request->hasFile('image')) {
            $freeGift->image = $freeGift->saveUploadedImage(
                $request->file('image'),
                $freeGift->image
            );
        } elseif ($request->has('image')) {
            $val = $request->get('image');
            $freeGift->image = ($val === '' || $val === 'null') ? null : $val;
        }

        $freeGift->save();

        // Synchroniser les produits - On synchronise si le champ est présent OU si on veut vider la liste
        if ($request->has('product_ids')) {
            $freeGift->products()->sync($request->input('product_ids', []));
        } elseif ($request->exists('product_ids') || $request->isMethod('PUT') || $request->isMethod('PATCH') || $request->has('_method')) {
            // Si on est en modification, on peut vouloir vider les produits si rien n'est envoyé
            // Pour les FormData, si l'array est vide, il n'est souvent pas envoyé du tout
            $freeGift->products()->sync($request->input('product_ids', []));
        }

        if ($request->has('dimension_ids')) {
            $freeGift->dimensions()->sync($request->input('dimension_ids', []));
        }

        $freeGift->load('products', 'dimensions');
        return $this->sendResponse($freeGift, 'Free gift updated successfully');
    }

    /**
     * Supprimer une offre gratuite
     */
    public function destroy(FreeGift $freeGift): JsonResponse
    {
        $this->authorize('delete', $freeGift);

        $freeGift->delete();
        return $this->sendResponse(null, 'Free gift deleted successfully');
    }

    /**
     * Récupérer les offres d'un produit spécifique
     */
    public function productGifts(Product $product): JsonResponse
    {
        $gifts = $product->freeGifts()->orderBy('titre', 'asc')->get();
        return $this->sendResponse($gifts, 'Product free gifts retrieved successfully');
    }
}
