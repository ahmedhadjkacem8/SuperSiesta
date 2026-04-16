<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DeliveryNoteItem extends Model
{
    use HasUuids;

    public $timestamps = false;

    protected $fillable = [
        'delivery_note_id',
        'product_id',
        'product_name',
        'product_image',
        'size_label',
        'quantity',
        'delivered_quantity',
        'grammage',
        'gifts_grammage',
    ];

    protected $casts = [
        'gifts_grammage' => 'array',
    ];

    public function deliveryNote(): BelongsTo
    {
        return $this->belongsTo(DeliveryNote::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
