<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\NotificationService;

class CreateTestNotification extends Command
{
    protected $signature = 'notifications:test {--type=order} {--color=blue}';
    protected $description = 'Créer une notification de test pour les admins (types: order|client|avis|alert)';

    public function __construct(
        protected NotificationService $notificationService
    ) {
        parent::__construct();
    }

    public function handle(): int
    {
        $type = $this->option('type') ?? 'order';
        $color = $this->option('color') ?? 'blue';

        try {
            $notification = $this->notificationService->notifyAdmin(
                title: "Notification de test ({$type})",
                message: "Ceci est une notification de test créée à " . now()->format('H:i:s'),
                type: $type,
                color: $color
            );

            $this->info("✅ Notification créée avec succès!");
            $this->line("ID: {$notification->id}");
            $this->line("Type: {$notification->type}");
            $this->line("Couleur: {$notification->color}");
            $this->line("Expire: {$notification->expires_at}");

            return self::SUCCESS;
        } catch (\Exception $e) {
            $this->error("Erreur lors de la création: " . $e->getMessage());
            return self::FAILURE;
        }
    }
}
