<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SeoScoreHistory extends Model
{
    protected $table = 'seo_score_history';

    public $timestamps = false; // only created_at via useCurrent()

    protected $fillable = ['seo_meta_id', 'score', 'created_at'];

    protected $casts = [
        'score'      => 'integer',
        'created_at' => 'datetime',
    ];

    public function seoMeta()
    {
        return $this->belongsTo(SeoMeta::class);
    }
}
