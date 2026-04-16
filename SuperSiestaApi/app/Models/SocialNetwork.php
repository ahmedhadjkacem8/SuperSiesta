<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SocialNetwork extends Model
{
    use HasFactory;

    protected $fillable = ['name', 'url', 'icon_id', 'is_active'];

    public function icon(): BelongsTo
    {
        return $this->belongsTo(Icon::class);
    }
}
