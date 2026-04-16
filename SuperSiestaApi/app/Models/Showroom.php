<?php

namespace App\Models;

use App\Traits\HasImageUpload;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Showroom extends Model
{
  use HasUuids, HasImageUpload;

  /** Dossier : public/uploads/showrooms/ */
  protected string $uploadFolder = 'showrooms';

  public $timestamps = false;

  protected $fillable = [
    'name',
    'contact_person_name',
    'contact_person_phone',
    'contact_person_email',
    'address',
    'city',
    'phone',
    'email',
    'lat',
    'lng',
    'google_maps_url',
    'image_url',
    'images',
    'opening_hours',
    'opening_hours_from',
    'opening_hours_until',
    'opening_days',
    'sort_order',
    'created_at',
  ];

  protected $casts = [
    'lat' => 'decimal:8',
    'lng' => 'decimal:8',
    'google_maps_url' => 'string',
    'opening_days' => 'json',
    'images' => 'array',
    'created_at' => 'datetime',
  ];

  protected static function booted(): void
  {
    static::deleting(function (Showroom $showroom) {
      $showroom->deleteAllImages(['image_url', 'images']);
    });
  }
}
