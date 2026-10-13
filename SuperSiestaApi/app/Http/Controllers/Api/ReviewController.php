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
    public function published(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'start_date' => 'nullable|date_format:Y-m-d|required_with:end_date',
            'end_date' => 'nullable|date_format:Y-m-d|required_with:start_date|after_or_equal:start_date',
        ]);

        $publishedReviews = Review::where('is_published', true);
        $query = clone $publishedReviews;
        if (!empty($validated['start_date']) && !empty($validated['end_date'])) {
            $query->whereDate('created_at', '>=', $validated['start_date'])
                ->whereDate('created_at', '<=', $validated['end_date']);
        }

        $reviews = (clone $query)
            ->latest()
            ->take(10)
            ->get();

        $count = (clone $query)->count();
        $avg = (clone $query)->avg('rating');
        $overallCount = (clone $publishedReviews)->count();
        $overallAverage = (clone $publishedReviews)->avg('rating');
        
        return $this->sendResponse([
            'reviews' => $reviews,
            'average' => $avg === null ? null : round($avg, 1),
            'count' => $count,
            'overall_average' => $overallAverage === null ? null : round($overallAverage, 1),
            'overall_count' => $overallCount,
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

        // Notifier l'admin
        try {
            app(\App\Services\NotificationService::class)->notifyNewReview($review);
        } catch (\Exception $e) { }

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
