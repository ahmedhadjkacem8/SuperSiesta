<?php

namespace App\Policies;

use App\Models\User;
use App\Models\ProductSize;

class ProductSizePolicy
{
    public function create(User $user): bool
    {
        return $user->roles()->where('role', 'admin')->exists();
    }

    public function update(User $user, ProductSize $size): bool
    {
        return $user->roles()->where('role', 'admin')->exists();
    }

    public function delete(User $user, ProductSize $size): bool
    {
        return $user->roles()->where('role', 'admin')->exists();
    }
}
