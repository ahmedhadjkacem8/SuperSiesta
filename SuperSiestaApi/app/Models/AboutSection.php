<?php

namespace App\Models;

use App\Traits\HasImageUpload;
use Illuminate\Database\Eloquent\Model;

class AboutSection extends Model
{
    use HasImageUpload;

    protected string $uploadFolder = 'about';

    protected $fillable = [
        'type', 'title', 'subtitle', 'description', 'image_url', 'items', 'sort_order', 'is_active'
    ];

    protected $casts = [
        'items' => 'array',
        'is_active' => 'boolean',
        'sort_order' => 'integer'
    ];

    protected static function booted(): void
    {
        static::deleting(function (AboutSection $section) {
            $section->deleteAllImages(['image_url']);
        });
    }
}
