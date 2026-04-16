<?php

namespace App\Policies;

use App\Models\Categorie;
use App\Models\User;

class CategoriePolicy
{
    public function viewAny(User $user): bool { return $user->isAdmin(); }
    public function view(User $user, Categorie $categorie): bool { return $user->isAdmin(); }
    public function create(User $user): bool { return $user->isAdmin(); }
    public function update(User $user, Categorie $categorie): bool { return $user->isAdmin(); }
    public function delete(User $user, Categorie $categorie): bool { return $user->isAdmin(); }
}
