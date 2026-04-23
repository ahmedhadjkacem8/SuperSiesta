<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Dimension extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = ['label', 'is_standard', 'sort_order'];

    protected $casts = [
        'is_standard' => 'boolean',
        'sort_order' => 'integer',
    ];

    public function freeGifts(): BelongsToMany
    {
        return $this->belongsToMany(FreeGift::class, 'dimension_free_gift');
    }
}
