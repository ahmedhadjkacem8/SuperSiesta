<?php

namespace App\Services;

use App\Models\Notification;
use Illuminate\Support\Carbon;

class NotificationService
{
    /**
     * Créer une notification pour l'admin
     */
    public function notifyAdmin(
        string $title,
        string $message,
        string $type = 'system',
        ?string $path = null,
        ?string $color = null,
        ?int $duration = null
    ): Notification {
        $color = $color ?? Notification::getColorForType($type);
        $duration = $duration ?? Notification::getDurationForType($type);

        return Notification::create([
            'title' => $title,
            'message' => $message,
            'type' => $type,
            'color' => $color,
            'duration' => $duration,
            'status' => 'new',
            'path' => $path,
            'is_read' => false,
            'user_id' => null, // Null pour l'admin
            'expires_at' => now()->addSeconds($duration * 60),
        ]);
    }

    /**
     * Créer une notification pour un client
     */
    public function notifyClient(
        int $userId,
        string $title,
        string $message,
        string $type = 'system',
        ?string $path = null,
        ?string $color = null,
        ?int $duration = null
    ): Notification {
        $color = $color ?? Notification::getColorForType($type);
        $duration = $duration ?? Notification::getDurationForType($type);

        return Notification::create([
            'title' => $title,
            'message' => $message,
            'type' => $type,
            'color' => $color,
            'duration' => $duration,
            'status' => 'new',
            'path' => $path,
            'is_read' => false,
            'user_id' => $userId,
            'expires_at' => now()->addSeconds($duration * 60),
        ]);
    }

    /**
     * Créer une notification de commande
     */
    public function notifyOrderCreated(
        $order,
        bool $notifyClient = false
    ): void {
        // Résoudre le nom du client
        $clientName = $order->full_name
            ?? $order->client->full_name
            ?? $order->client->name
            ?? 'Client inconnu';

        // Empêcher la création de doublons : si une notification admin de type 'order'
        // pour le même numéro de commande existe récemment, skip
        $recentExists = Notification::forAdmin()
            ->where('type', 'order')
            ->where('title', 'like', "%#{$order->order_number}%")
            ->where('created_at', '>=', now()->subMinutes(10))
            ->exists();

        if (! $recentExists) {
            $this->notifyAdmin(
                title: "🛒 Nouvelle commande #{$order->order_number}",
                message: "{$clientName} — " . number_format($order->total, 2, ',', ' ') . " DT",
                type: 'order',
                path: "/admin/commandes",
                color: 'blue'
            );
        }

        // Notification client si enabled
        if ($notifyClient && $order->client_id) {
            $this->notifyClient(
                userId: $order->client_id,
                title: "Votre commande #{$order->order_number} a été créée",
                message: "Nous avons bien reçu votre commande. Statut: {$order->status}",
                type: 'order',
                path: "/orders/{$order->id}",
                color: 'green'
            );
        }
    }

    /**
     * Créer une notification de changement de statut de commande
     */
    public function notifyOrderStatusChanged(
        $order,
        string $oldStatus,
        string $newStatus
    ): void {
        $statusText = $this->getStatusText($newStatus);

        // Notification admin
        $this->notifyAdmin(
            title: "Commande #{$order->order_number} - Statut changé",
            message: "La commande est passée de '{$oldStatus}' à '{$newStatus}'",
            type: 'order',
            path: "/orders/{$order->id}",
            color: $this->getColorForStatus($newStatus)
        );

        // Notification client
        if ($order->client_id) {
            $this->notifyClient(
                userId: $order->client_id,
                title: "Votre commande #{$order->order_number}",
                message: "Statut: {$statusText}",
                type: 'order',
                path: "/orders/{$order->id}",
                color: $this->getColorForStatus($newStatus)
            );
        }
    }

    /**
     * Créer une notification de nouvel avis/review
     */
    public function notifyNewReview($review): void {
        $customerName = $review->customer_name ?? 'Anonymous';
        $this->notifyAdmin(
            title: "Nouvel avis client",
            message: "Avis {$review->rating}/5 de {$customerName}",
            type: 'avis',
            path: "/reviews/{$review->id}",
            color: 'purple'
        );
    }

    /**
     * Créer une notification de nouveau client
     */
    public function notifyNewClient($client): void {
        $this->notifyAdmin(
            title: "Nouveau client inscrit",
            message: "{$client->name} ({$client->email})",
            type: 'client',
            path: "/clients/{$client->id}",
            color: 'green'
        );
    }

    /**
     * Créer une notification système pour l'admin
     */
    public function notifyAdminSystem(
        string $title,
        string $message,
        ?string $path = null
    ): void {
        // Pas de type 'system' supporté actuellement
        // Utilisez un des types valides: order, client, avis
        $this->notifyAdmin(
            title: $title,
            message: $message,
            type: 'order', // Par défaut
            path: $path,
            color: 'yellow',
            duration: 5
        );
    }

    /**
     * Obtenir le texte du statut
     */
    private function getStatusText(string $status): string
    {
        $statuses = [
            'pending' => 'En attente',
            'confirmed' => 'Confirmée',
            'processing' => 'En traitement',
            'shipped' => 'Expédiée',
            'delivered' => 'Livrée',
            'cancelled' => 'Annulée',
            'refunded' => 'Remboursée',
        ];

        return $statuses[$status] ?? $status;
    }

    /**
     * Obtenir la couleur pour un statut
     */
    private function getColorForStatus(string $status): string
    {
        $colors = [
            'pending' => 'yellow',
            'confirmed' => 'blue',
            'processing' => 'blue',
            'shipped' => 'orange',
            'delivered' => 'green',
            'cancelled' => 'red',
            'refunded' => 'red',
        ];

        return $colors[$status] ?? 'gray';
    }

    /**
     * Marquer les notifications expirées
     */
    public function markExpiredNotifications(): int
    {
        return Notification::where('status', '!=', 'expired')
            ->whereNotNull('expires_at')
            ->where('expires_at', '<=', now())
            ->update(['status' => 'expired']);
    }

    /**
     * Nettoyer les anciennes notifications
     */
    public function cleanOldNotifications(int $days = 30): int
    {
        return Notification::where('created_at', '<=', now()->subDays($days))
            ->where('status', 'expired')
            ->delete();
    }
}
