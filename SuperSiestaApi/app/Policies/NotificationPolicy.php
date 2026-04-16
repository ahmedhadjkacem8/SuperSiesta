<?php

namespace App\Policies;

use App\Models\Notification;
use App\Models\User;

class NotificationPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Notification $notification): bool
    {
        // L'admin peut voir les notifications sans user_id
        // Les clients peuvent voir que leurs notifications
        if (is_null($notification->user_id)) {
            return $user->isAdmin();
        }

        return $notification->user_id === $user->id;
    }

    public function create(User $user): bool
    {
        return $user->isAdmin();
    }

    public function update(User $user, Notification $notification): bool
    {
        return $user->isAdmin();
    }

    public function delete(User $user, Notification $notification): bool
    {
        return $user->isAdmin();
    }
}
