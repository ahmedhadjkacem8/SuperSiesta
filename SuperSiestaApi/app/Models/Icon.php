<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Icon extends Model
{
    use HasFactory;

    protected $fillable = ['name', 'lucide_name'];

    public function socialNetworks(): HasMany
    {
        return $this->hasMany(SocialNetwork::class);
    }
}
