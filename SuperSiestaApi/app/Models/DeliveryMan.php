<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class DeliveryMan extends Model
{
    use HasUuids;

    protected $fillable = [
        'name',
        'phone',
        'vehicle',
        'is_active',
    ];
}
