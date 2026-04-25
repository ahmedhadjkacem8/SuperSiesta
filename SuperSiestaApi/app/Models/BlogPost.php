<?php

namespace App\Models;

use App\Traits\HasImageUpload;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class BlogPost extends Model
{
    use HasUuids, HasImageUpload;

    /** Dossier : public/uploads/blog-posts/ */
    protected string $uploadFolder = 'blog-posts';

    protected $fillable = [
        'title',
        'slug',
        'excerpt',
        'content',
        'image_url',
        'category',
        'tags',
        'published',
        'is_favorite',
        'published_at',
        'sort_order',
    ];

    protected $casts = [
        'tags'         => 'array',
        'published'    => 'boolean',
        'is_favorite'   => 'boolean',
        'published_at' => 'datetime',
        'sort_order'    => 'integer',
    ];

    protected static function booted(): void
    {
        static::deleting(function (BlogPost $post) {
            $post->deleteAllImages(['image_url']);
        });
    }

    public function scopePublished($query)
    {
        return $query->where('published', true);
    }
}
