<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Quote;

class QuotePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->roles()->where('role', 'admin')->exists();
    }

    public function view(User $user, Quote $quote): bool
    {
        return $user->roles()->where('role', 'admin')->exists();
    }

    public function create(User $user): bool
    {
        return $user->roles()->where('role', 'admin')->exists();
    }

    public function update(User $user, Quote $quote): bool
    {
        return $user->roles()->where('role', 'admin')->exists();
    }

    public function delete(User $user, Quote $quote): bool
    {
        return $user->roles()->where('role', 'admin')->exists();
    }
}
