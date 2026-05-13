<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Prospect extends Model
{
    use HasUuids;

    protected $fillable = [
        'full_name',
        'email',
        'phone',
        'phone2',
        'address',
        'city',
        'notes',
        'cart_items',
        'total',
        'status',
    ];

    protected $casts = [
        'cart_items' => 'array',
        'total' => 'decimal:2',
    ];
}
