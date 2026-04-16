<?php

namespace App\Models;

use App\Traits\HasImageUpload;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class FreeGift extends Model
{
    /** @use HasFactory<\Database\Factories\FreeGiftFactory> */
    use HasFactory, HasImageUpload;

    protected string $uploadFolder = 'free_gifts';

    protected $fillable = [
        'titre',
        'description',
        'image',
        'poids',
    ];

    protected $casts = [
        'poids' => 'integer',
    ];

    protected static function booted(): void
    {
        static::deleting(function (FreeGift $freeGift) {
            $freeGift->deleteAllImages(['image']);
        });
    }

    /**
     * Les produits associés à cette offre gratuite
     */
    public function products(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'free_gift_product');
    }
}
