<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Order extends Model
{
    use HasUuids;

    protected $fillable = [
        'user_id',
        'client_id',
        'quote_id',
        'invoice_id',
        'order_number',
        'status',
        'requires_special_discount',
        'full_name',
        'email',
        'phone',
        'phone2',
        'address',
        'city',
        'latitude',
        'longitude',
        'notes',
        'payment_proof_path',
        'bl_contact',
        'gclid',
        'gbraid',
        'wbraid',
        'ads_click_captured_at',
        'ads_exported_at',
        'subtotal',
        'total',
    ];

    protected $appends = ['delivery_note_id'];

    protected $hidden = ['payment_proof_path'];

    protected $casts = [
        'requires_special_discount' => 'boolean',
        'subtotal' => 'decimal:2',
        'total' => 'decimal:2',
        'ads_click_captured_at' => 'datetime',
        'ads_exported_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function quote(): BelongsTo
    {
        return $this->belongsTo(Quote::class);
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function deliveryNotes(): HasMany
    {
        return $this->hasMany(DeliveryNote::class);
    }

    public function getDeliveryNoteIdAttribute()
    {
        // Try to get the first delivery note ID if the relationship is loaded or exists
        return $this->deliveryNotes->first()?->id;
    }
}
