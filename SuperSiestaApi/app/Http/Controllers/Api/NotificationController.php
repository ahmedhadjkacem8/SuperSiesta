<?php

namespace App\Http\Controllers\Api;

use App\Models\Notification;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class NotificationController extends BaseController
{
    protected $notificationService;

    public function __construct(NotificationService $notificationService)
    {
        $this->notificationService = $notificationService;
    }

    /**
     * Récupérer les notifications pour l'admin
     */
    public function adminIndex(Request $request): JsonResponse
    {
        $query = Notification::forAdmin()
            ->orderBy('created_at', 'desc');

        // Filtrer par type
        if ($request->has('type')) {
            $query->byType($request->get('type'));
        }

        // Filtrer par statut
        if ($request->has('status')) {
            $query->where('status', $request->get('status'));
        }

        // Pagination
        $per_page = $request->get('per_page', 50);
        $notifications = $query->paginate($per_page);

        // Récupérer le nombre de non-lus
        $unreadCount = Notification::forAdmin()
            ->unread()
            ->count();

        return response()->json([
            'data' => $notifications->items(),
            'pagination' => [
                'total' => $notifications->total(),
                'per_page' => $notifications->perPage(),
                'current_page' => $notifications->currentPage(),
                'last_page' => $notifications->lastPage(),
            ],
            'unreadCount' => $unreadCount,
        ]);
    }

    /**
     * Récupérer les notifications pour un client
     */
    public function clientIndex(Request $request): JsonResponse
    {
        $user = $request->user();
        
        $query = Notification::forClient($user->id)
            ->orderBy('created_at', 'desc');

        // Filtrer par type
        if ($request->has('type')) {
            $query->byType($request->get('type'));
        }

        // Filtrer par statut
        if ($request->has('status')) {
            $query->where('status', $request->get('status'));
        }

        // Pagination
        $per_page = $request->get('per_page', 20);
        $notifications = $query->paginate($per_page);

        // Récupérer le nombre de non-lus
        $unreadCount = Notification::forClient($user->id)
            ->unread()
            ->count();

        return response()->json([
            'data' => $notifications->items(),
            'pagination' => [
                'total' => $notifications->total(),
                'per_page' => $notifications->perPage(),
                'current_page' => $notifications->currentPage(),
                'last_page' => $notifications->lastPage(),
            ],
            'unreadCount' => $unreadCount,
        ]);
    }

    /**
     * Récupérer une notification spécifique
     */
    public function show(Notification $notification): JsonResponse
    {
        return response()->json($notification);
    }

    /**
     * Marquer une notification comme lue
     */
    public function markAsRead(Notification $notification): JsonResponse
    {
        $notification->markAsRead();

        return response()->json([
            'success' => true,
            'message' => 'Notification marquée comme lue',
            'notification' => $notification,
        ]);
    }

    /**
     * Marquer toutes les notifications comme lues (admin)
     */
    public function markAllAdminAsRead(): JsonResponse
    {
        Notification::forAdmin()
            ->unread()
            ->update([
                'is_read' => true,
                'status' => 'viewed',
                'read_at' => now(),
            ]);

        return response()->json([
            'success' => true,
            'message' => 'Toutes les notifications marquées comme lues',
        ]);
    }

    /**
     * Marquer toutes les notifications comme lues (client)
     */
    public function markAllClientAsRead(Request $request): JsonResponse
    {
        $user = $request->user();
        
        Notification::forClient($user->id)
            ->unread()
            ->update([
                'is_read' => true,
                'status' => 'viewed',
                'read_at' => now(),
            ]);

        return response()->json([
            'success' => true,
            'message' => 'Toutes vos notifications marquées comme lues',
        ]);
    }

    /**
     * Créer une notification (pour admin uniquement) - utilisé via le service
     */
    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', Notification::class);

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'message' => 'required|string',
            'type' => 'required|in:order,client,avis',
            'path' => 'nullable|string',
            'color' => 'nullable|in:red,green,blue,yellow,orange,purple,gray',
            'duration' => 'nullable|integer|min:1|max:60',
            'user_id' => 'nullable|exists:users,id',
        ]);

        // Ajouter les valeurs par défaut
        if (!isset($validated['color'])) {
            $validated['color'] = Notification::getColorForType($validated['type']);
        }

        if (!isset($validated['duration'])) {
            $validated['duration'] = Notification::getDurationForType($validated['type']);
        }

        $validated['status'] = 'new';
        $validated['expires_at'] = now()->addSeconds($validated['duration'] * 60);

        $notification = Notification::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Notification créée',
            'notification' => $notification,
        ], 201);
    }

    /**
     * Supprimer une notification
     */
    public function destroy(Notification $notification): JsonResponse
    {
        $this->authorize('delete', $notification);
        
        $notification->delete();

        return response()->json([
            'success' => true,
            'message' => 'Notification supprimée',
        ]);
    }

    /**
     * Nettoyer les notifications expirées
     */
    public function cleanExpired(): JsonResponse
    {
        $deleted = Notification::where('status', 'expired')
            ->orWhere(function ($query) {
                $query->whereNotNull('expires_at')
                    ->where('expires_at', '<=', now());
            })
            ->delete();

        return response()->json([
            'success' => true,
            'message' => "{$deleted} notifications expirées supprimées",
            'deleted_count' => $deleted,
        ]);
    }

    /**
     * Supprimer toutes les notifications admin (clean all)
     */
    public function cleanAllAdmin(): JsonResponse
    {
        // Autoriser seulement les admins (utiliser la règle 'create' qui vérifie isAdmin)
        $this->authorize('create', Notification::class);

        $deleted = Notification::forAdmin()->delete();

        return response()->json([
            'success' => true,
            'message' => "{$deleted} notifications administrateur supprimées",
            'deleted_count' => $deleted,
        ]);
    }

    /**
     * Récupérer les statistiques de notifications
     */
    public function getStats(Request $request): JsonResponse
    {
        $stats = [
            'admin' => [
                'total' => Notification::forAdmin()->count(),
                'unread' => Notification::forAdmin()->unread()->count(),
                'by_type' => Notification::forAdmin()
                    ->selectRaw('type, count(*) as count')
                    ->groupBy('type')
                    ->pluck('count', 'type')
                    ->toArray(),
                'by_status' => Notification::forAdmin()
                    ->selectRaw('status, count(*) as count')
                    ->groupBy('status')
                    ->pluck('count', 'status')
                    ->toArray(),
            ],
        ];

        // Stats client si l'utilisateur est authentifié
        if ($request->user()) {
            $userId = $request->user()->id;
            $stats['client'] = [
                'total' => Notification::forClient($userId)->count(),
                'unread' => Notification::forClient($userId)->unread()->count(),
                'by_type' => Notification::forClient($userId)
                    ->selectRaw('type, count(*) as count')
                    ->groupBy('type')
                    ->pluck('count', 'type')
                    ->toArray(),
            ];
        }

        return response()->json($stats);
    }
}
