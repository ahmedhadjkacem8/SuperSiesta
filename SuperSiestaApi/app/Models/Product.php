<?php

namespace App\Models;

use App\Traits\HasImageUpload;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Product extends Model
{
    use HasUuids, HasImageUpload;
    
    /**
     * Resolve the route binding to support both ID and Slug
     * 
     * @param mixed $value
     * @param string|null $field
     * @return \Illuminate\Database\Eloquent\Model|null
     */
    public function resolveRouteBinding($value, $field = null)
    {
        return $this->where('id', $value)
                    ->orWhere('slug', $value)
                    ->firstOrFail();
    }

    /** Dossier : public/uploads/products/ */
    protected string $uploadFolder = 'products';

    protected $fillable = [
        'name',
        'slug',
        'categorie',
        'fermete',
        'gamme',
        'image',
        'images',
        'description',
        'specs',
        'badge',
        'in_promo',
        'grammage',
    ];

    protected $casts = [
        'images'   => 'array',
        'specs'    => 'array',
        'in_promo' => 'boolean',
    ];

    protected static function booted(): void
    {
        static::deleting(function (Product $product) {
            $product->deleteAllImages(['image', 'images']);
        });
    }

    public function sizes(): HasMany
    {
        return $this->hasMany(ProductSize::class);
    }

    public function orderItems(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    /**
     * Les offres gratuites associées à ce produit
     */
    public function freeGifts(): BelongsToMany
    {
        return $this->belongsToMany(FreeGift::class, 'free_gift_product');
    }
}
