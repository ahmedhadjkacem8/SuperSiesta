<?php

namespace App\Models;

use App\Traits\HasImageUpload;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class HeroSlide extends Model
{
    use HasUuids, HasImageUpload;

    /** Dossier : public/uploads/hero-slides/ */
    protected string $uploadFolder = 'hero-slides';

    protected $fillable = [
        'title',
        'subtitle',
        'cta_text',
        'cta_link',
        'image_url',
        'sort_order',
        'active',
    ];

    protected $casts = [
        'active' => 'boolean',
    ];

    protected static function booted(): void
    {
        static::deleting(function (HeroSlide $slide) {
            $slide->deleteAllImages(['image_url']);
        });
    }

    public function scopeActive($query)
    {
        return $query->where('active', true);
    }
}
