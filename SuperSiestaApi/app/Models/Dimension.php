<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Dimension extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = ['label', 'is_standard'];

    protected $casts = [
        'is_standard' => 'boolean',
    ];
}
