<?php

namespace App\Policies;

use App\Models\User;
use App\Models\TreasuryEntry;

class TreasuryEntryPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->roles()->where('role', 'admin')->exists();
    }

    public function create(User $user): bool
    {
        return $user->roles()->where('role', 'admin')->exists();
    }

    public function update(User $user, TreasuryEntry $entry): bool
    {
        return $user->roles()->where('role', 'admin')->exists();
    }

    public function delete(User $user, TreasuryEntry $entry): bool
    {
        return $user->roles()->where('role', 'admin')->exists();
    }
}
