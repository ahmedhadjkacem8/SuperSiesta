<?php

namespace App\Http\Controllers\Api;

use App\Models\Review;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ReviewController extends BaseController
{
    /**
     * Publique : Récupérer uniquement les avis publiés pour la page d'accueil
     */
    public function published(): JsonResponse
    {
        $reviews = Review::where('is_published', true)
            ->latest()
            ->take(10)
            ->get();
        
        $avg = Review::where('is_published', true)->avg('rating') ?: 5.0;
        
        return $this->sendResponse([
            'reviews' => $reviews,
            'average' => round($avg, 1)
        ], 'Published reviews retrieved successfully');
    }

    /**
     * Publique : Enregistrer un nouvel avis/message
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'nullable|string',
            'email' => 'nullable|email',
            'phone' => 'nullable|string',
            'city' => 'nullable|string',
            'message' => 'required|string',
            'rating' => 'required|integer|min:1|max:5',
        ]);

        if (Auth::check()) {
            $validated['user_id'] = Auth::id();
            // Optionnel : si le nom/email n'est pas fourni, utiliser celui de l'utilisateur
            $validated['name'] = $validated['name'] ?? Auth::user()->name;
            $validated['email'] = $validated['email'] ?? Auth::user()->email;
        }

        $review = Review::create($validated);
        return $this->sendResponse($review, 'Merci ! Votre message a été envoyé avec succès.');
    }

    /**
     * Admin : Voir TOUS les messages (soumis à auth:sanctum)
     */
    public function index(): JsonResponse
    {
        $reviews = Review::with('user')->latest()->get();
        return $this->sendResponse($reviews, 'All reviews retrieved successfully');
    }

    /**
     * Admin : Publier ou Dépublier un avis
     */
    public function togglePublish($id): JsonResponse
    {
        $review = Review::findOrFail($id);
        $review->is_published = !$review->is_published;
        $review->save();
        return $this->sendResponse($review, 'Statut de publication mis à jour');
    }

    /**
     * Admin : Supprimer un avis
     */
    public function destroy($id): JsonResponse
    {
        $review = Review::findOrFail($id);
        $review->delete();
        return $this->sendResponse([], 'Message supprimé avec succès');
    }
}
