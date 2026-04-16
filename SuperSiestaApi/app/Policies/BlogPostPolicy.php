<?php

namespace App\Policies;

use App\Models\User;
use App\Models\BlogPost;

class BlogPostPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, BlogPost $post): bool
    {
        return $post->published || $user->roles()->where('role', 'admin')->exists();
    }

    public function create(User $user): bool
    {
        return $user->roles()->where('role', 'admin')->exists();
    }

    public function update(User $user, BlogPost $post): bool
    {
        return $user->roles()->where('role', 'admin')->exists();
    }

    public function delete(User $user, BlogPost $post): bool
    {
        return $user->roles()->where('role', 'admin')->exists();
    }
}
