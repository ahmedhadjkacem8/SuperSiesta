<?php

namespace App\Models;

use App\Traits\HasImageUpload;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Gamme extends Model
{
    use HasUuids, HasImageUpload;

    /** Dossier : public/uploads/gammes/ */
    protected string $uploadFolder = 'gammes';

    protected $fillable = [
        'name',
        'slug',
        'cover_image',
        'description',
        'video_url',
        'photos',
        'images_3d',
        'sort_order',
    ];

    protected $casts = [
        'photos'    => 'array',
        'images_3d' => 'array',
    ];

    protected static function booted(): void
    {
        static::deleting(function (Gamme $gamme) {
            $gamme->deleteAllImages(['cover_image', 'photos', 'images_3d', 'video_url']);
        });
    }
}
