<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class TreasuryEntry extends Model
{
    use HasUuids;

    public $timestamps = false;

    protected $fillable = [
        'type',
        'category',
        'amount',
        'description',
        'reference',
        'entry_date',
        'created_at',
    ];

    protected $casts = [
        'entry_date' => 'date',
        'created_at' => 'datetime',
        'amount' => 'decimal:3',
    ];
}
