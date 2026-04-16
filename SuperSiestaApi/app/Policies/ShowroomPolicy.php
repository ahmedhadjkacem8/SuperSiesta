<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Showroom;

class ShowroomPolicy
{
    public function create(User $user): bool
    {
        return $user->roles()->where('role', 'admin')->exists();
    }

    public function update(User $user, Showroom $showroom): bool
    {
        return $user->roles()->where('role', 'admin')->exists();
    }

    public function delete(User $user, Showroom $showroom): bool
    {
        return $user->roles()->where('role', 'admin')->exists();
    }
}
