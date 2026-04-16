<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Invoice;

class InvoicePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->roles()->where('role', 'admin')->exists();
    }

    public function view(User $user, Invoice $invoice): bool
    {
        return $user->roles()->where('role', 'admin')->exists();
    }

    public function create(User $user): bool
    {
        return $user->roles()->where('role', 'admin')->exists();
    }

    public function update(User $user, Invoice $invoice): bool
    {
        return $user->roles()->where('role', 'admin')->exists();
    }

    public function delete(User $user, Invoice $invoice): bool
    {
        return $user->roles()->where('role', 'admin')->exists();
    }
}
