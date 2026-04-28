<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use App\Traits\HasImageUpload;

class Categorie extends Model
{
    use HasUuids, HasImageUpload;

    protected $fillable = ['label', 'image', 'description', 'color', 'text_color', 'sort_order'];

    protected $casts = [
        'sort_order' => 'integer',
    ];
}
