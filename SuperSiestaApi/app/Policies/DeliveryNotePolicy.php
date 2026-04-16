<?php

namespace App\Policies;

use App\Models\User;
use App\Models\DeliveryNote;

class DeliveryNotePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->roles()->where('role', 'admin')->exists();
    }

    public function view(User $user, DeliveryNote $note): bool
    {
        return $user->roles()->where('role', 'admin')->exists();
    }

    public function create(User $user): bool
    {
        return $user->roles()->where('role', 'admin')->exists();
    }

    public function update(User $user, DeliveryNote $note): bool
    {
        return $user->roles()->where('role', 'admin')->exists();
    }

    public function delete(User $user, DeliveryNote $note): bool
    {
        return $user->roles()->where('role', 'admin')->exists();
    }
}
