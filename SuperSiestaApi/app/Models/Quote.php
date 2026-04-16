<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Quote extends Model
{
    use HasUuids;

    protected $fillable = [
        'quote_number',
        'client_id',
        'client_name',
        'status',
        'total',
        'discount_type',
        'discount_value',
        'notes',
        'valid_until',
    ];

    protected $casts = [
        'valid_until' => 'date',
        'total' => 'decimal:3',
        'discount_value' => 'decimal:3',
    ];

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(InvoiceItem::class);
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }
}
