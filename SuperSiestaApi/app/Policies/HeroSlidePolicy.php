<?php

namespace App\Policies;

use App\Models\User;
use App\Models\HeroSlide;

class HeroSlidePolicy
{
    public function create(User $user): bool
    {
        return $user->roles()->where('role', 'admin')->exists();
    }

    public function update(User $user, HeroSlide $slide): bool
    {
        return $user->roles()->where('role', 'admin')->exists();
    }

    public function delete(User $user, HeroSlide $slide): bool
    {
        return $user->roles()->where('role', 'admin')->exists();
    }
}
