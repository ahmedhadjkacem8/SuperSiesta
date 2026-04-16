<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Support\Carbon;

class Notification extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'message',
        'type',
        'color',
        'duration',
        'status',
        'path',
        'is_read',
        'read_at',
        'expires_at',
        'user_id',
    ];

    protected $casts = [
        'is_read' => 'boolean',
        'read_at' => 'datetime',
        'expires_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // Relations
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // Scopes
    public function scopeUnread($query)
    {
        return $query->where('is_read', false)->where('status', '!=', 'expired');
    }

    public function scopeForAdmin($query)
    {
        return $query->whereNull('user_id');
    }

    public function scopeForClient($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    public function scopeByType($query, $type)
    {
        return $query->where('type', $type);
    }

    public function scopeNotExpired($query)
    {
        return $query->where(function ($q) {
            $q->whereNull('expires_at')
                ->orWhere('expires_at', '>', now());
        })->where('status', '!=', 'expired');
    }

    public function scopeNew($query)
    {
        return $query->where('status', 'new');
    }

    public function scopeViewed($query)
    {
        return $query->where('status', 'viewed');
    }

    // Mutateurs
    public function markAsRead()
    {
        $this->update([
            'is_read' => true,
            'status' => 'viewed',
            'read_at' => now(),
        ]);

        return $this;
    }

    public function markAsExpired()
    {
        $this->update([
            'status' => 'expired',
        ]);

        return $this;
    }

    // Accesseurs
    public function getIsNewAttribute()
    {
        return $this->status === 'new';
    }

    public function getIsExpiredAttribute()
    {
        return $this->status === 'expired' || 
               ($this->expires_at && $this->expires_at <= now());
    }

    // Colors mapping pour les types
    public static function getColorForType($type)
    {
        $colors = [
            'order' => 'blue',
            'client' => 'green',
            'avis' => 'purple',
        ];

        return $colors[$type] ?? 'blue';
    }

    // Durée par défaut par type
    public static function getDurationForType($type)
    {
        $durations = [
            'order' => 10,
            'client' => 8,
            'avis' => 7,
        ];

        return $durations[$type] ?? 5;
    }
}
