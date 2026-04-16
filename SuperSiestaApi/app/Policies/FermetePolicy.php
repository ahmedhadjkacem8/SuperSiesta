<?php

namespace App\Policies;

use App\Models\Fermete;
use App\Models\User;

class FermetePolicy
{
    public function viewAny(User $user): bool { return $user->isAdmin(); }
    public function view(User $user, Fermete $fermete): bool { return $user->isAdmin(); }
    public function create(User $user): bool { return $user->isAdmin(); }
    public function update(User $user, Fermete $fermete): bool { return $user->isAdmin(); }
    public function delete(User $user, Fermete $fermete): bool { return $user->isAdmin(); }
}
