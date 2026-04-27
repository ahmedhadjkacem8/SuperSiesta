<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Gamme;

class GammePolicy
{
    public function create(User $user): bool
    {
        return $user->roles()->where('role', 'admin')->exists();
    }

    public function update(User $user, Gamme $gamme): bool
    {
        return $user->roles()->where('role', 'admin')->exists();
    }

    public function delete(User $user, Gamme $gamme): bool
    {
        return $user->roles()->where('role', 'admin')->exists();
    }

    public function reorder(User $user): bool
    {
        return $user->roles()->where('role', 'admin')->exists();
    }
}
