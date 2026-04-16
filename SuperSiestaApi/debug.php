<?php

use App\Models\User;
use App\Models\Notification;

// Vérifier les notifications
echo "=== DEBUG NOTIFICATIONS ===" . PHP_EOL;
echo "Total: " . Notification::count() . PHP_EOL;
echo "Admin (user_id = null): " . Notification::forAdmin()->count() . PHP_EOL;
echo "Non-lues: " . Notification::where('is_read', false)->count() . PHP_EOL;

// Lister les notifications
echo PHP_EOL . "Détail des notifications:" . PHP_EOL;
foreach (Notification::limit(5)->get() as $notif) {
    echo "ID: {$notif->id}, Type: {$notif->type}, Status: {$notif->status}, user_id: {$notif->user_id}, color: {$notif->color}" . PHP_EOL;
}

// Créer un token de test
$user = User::first();
if ($user) {
    $token = $user->createToken('debug')->plainTextToken;
    echo PHP_EOL . "Token pour tester: " . $token . PHP_EOL;
}
