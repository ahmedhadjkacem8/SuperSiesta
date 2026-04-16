<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Order;

class OrderPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Order $order): bool
    {
        return $order->user_id === $user->id || $user->roles()->where('role', 'admin')->exists();
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, Order $order): bool
    {
        return $order->user_id === $user->id || $user->roles()->where('role', 'admin')->exists();
    }

    public function delete(User $user, Order $order): bool
    {
        return $user->roles()->where('role', 'admin')->exists();
    }
}
