<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class SeoMeta extends Model
{
    protected $table = 'seo_metas';

    protected $fillable = [
        'page_identifier',
        'page_label',
        'seoable_type',
        'seoable_id',
        // Core meta
        'meta_title',
        'meta_description',
        'meta_keywords',
        'meta_robots',
        // Open Graph
        'og_title',
        'og_description',
        'og_image',
        'og_type',
        'og_locale',
        // Twitter Cards
        'twitter_card',
        'twitter_title',
        'twitter_description',
        'twitter_image',
        // JSON-LD
        'json_ld_type',
        'json_ld_data',
        // Sitemap
        'priority',
        'changefreq',
        // Control
        'seo_score',
        'is_active',
        'last_analyzed_at',
        'notes',
        'recommendations',
    ];

    protected $casts = [
        'json_ld_data'     => 'array',
        'recommendations'  => 'array',
        'is_active'        => 'boolean',
        'priority'         => 'decimal:1',
        'seo_score'        => 'integer',
        'last_analyzed_at' => 'datetime',
    ];

    // ─── Relationships ───

    /**
     * Polymorphic relation to any seoable entity (Product, Category, etc.)
     */
    public function seoable()
    {
        return $this->morphTo();
    }

    /**
     * Score history entries.
     */
    public function scoreHistory()
    {
        return $this->hasMany(SeoScoreHistory::class)->orderByDesc('created_at');
    }

    // ─── Scopes ───

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopePageIdentifier($query, string $identifier)
    {
        return $query->where('page_identifier', $identifier);
    }

    public function scopeStaticPages($query)
    {
        return $query->whereNull('seoable_type');
    }

    public function scopeEntityPages($query)
    {
        return $query->whereNotNull('seoable_type');
    }

    // ─── Mutators ───

    /**
     * Normalize keywords: trim whitespace, lowercase, remove duplicates.
     */
    public function setMetaKeywordsAttribute($value)
    {
        if (is_array($value)) {
            $value = implode(',', $value);
        }

        if ($value) {
            $keywords = array_map('trim', explode(',', $value));
            $keywords = array_map('mb_strtolower', $keywords);
            $keywords = array_unique(array_filter($keywords));
            $value = implode(', ', $keywords);
        }

        $this->attributes['meta_keywords'] = $value;
    }

    // ─── SEO Score Calculation ───

    /**
     * Calculate and update the SEO score (0–100) with enriched quality checks.
     * Saves the new score to seo_score_history and stores prioritized recommendations.
     */
    public function calculateScore(): int
    {
        $score = 0;
        $recommendations = [];

        // ── 1. Meta Title (max 22 pts) ─────────────────────────────────────
        if ($this->meta_title) {
            $len = mb_strlen($this->meta_title);
            if ($len >= 30 && $len <= 60) {
                $score += 22;
            } elseif ($len >= 20 && $len <= 70) {
                $score += 13;
                $recommendations[] = [
                    'priority' => 'medium',
                    'field'    => 'meta_title',
                    'message'  => "Le titre ({$len} car.) devrait idéalement faire entre 30 et 60 caractères.",
                ];
            } else {
                $score += 4;
                $recommendations[] = [
                    'priority' => 'high',
                    'field'    => 'meta_title',
                    'message'  => "Le titre ({$len} car.) est " . ($len < 30 ? 'trop court' : 'trop long') . ". Visez 30–60 caractères.",
                ];
            }
        } else {
            $recommendations[] = [
                'priority' => 'high',
                'field'    => 'meta_title',
                'message'  => 'Le titre SEO est manquant. C\'est le champ le plus important pour le référencement.',
            ];
        }

        // ── 2. Meta Description (max 22 pts) ───────────────────────────────
        if ($this->meta_description) {
            $len = mb_strlen($this->meta_description);
            if ($len >= 120 && $len <= 155) {
                $score += 22;
            } elseif ($len >= 80 && $len <= 160) {
                $score += 13;
                $recommendations[] = [
                    'priority' => 'medium',
                    'field'    => 'meta_description',
                    'message'  => "La description ({$len} car.) devrait idéalement faire entre 120 et 155 caractères.",
                ];
            } else {
                $score += 4;
                $recommendations[] = [
                    'priority' => 'high',
                    'field'    => 'meta_description',
                    'message'  => "La description ({$len} car.) est " . ($len < 120 ? 'trop courte' : 'trop longue') . ". Visez 120–155 caractères.",
                ];
            }
        } else {
            $recommendations[] = [
                'priority' => 'high',
                'field'    => 'meta_description',
                'message'  => 'La description SEO est manquante. Elle influence le taux de clic dans les résultats.',
            ];
        }

        // ── 3. Keywords presence & semantic overlap (max 14 pts) ───────────
        if ($this->meta_keywords) {
            $keywords = array_filter(array_map('trim', explode(',', $this->meta_keywords)));
            $kwCount  = count($keywords);

            if ($kwCount >= 3 && $kwCount <= 10) {
                $score += 8;
            } elseif ($kwCount >= 1) {
                $score += 4;
                $recommendations[] = [
                    'priority' => 'medium',
                    'field'    => 'meta_keywords',
                    'message'  => "Seulement {$kwCount} mot(s)-clé(s) définis. Recommandé : entre 3 et 10 mots-clés.",
                ];
            }

            // Semantic overlap: check if at least one keyword appears in title or description
            $searchText = mb_strtolower(
                ($this->meta_title ?? '') . ' ' . ($this->meta_description ?? '')
            );
            $matchedKeywords = array_filter($keywords, function ($kw) use ($searchText) {
                return mb_strpos($searchText, mb_strtolower($kw)) !== false;
            });
            $matchedCount = count($matchedKeywords);
            $overlapRatio = $kwCount > 0 ? ($matchedCount / $kwCount) : 0;

            if ($overlapRatio >= 0.5) {
                $score += 6;
            } elseif ($overlapRatio > 0) {
                $score += 3;
                $recommendations[] = [
                    'priority' => 'medium',
                    'field'    => 'meta_keywords',
                    'message'  => "Seulement {$matchedCount}/{$kwCount} mot(s)-clé(s) présents dans le titre/description. Améliorez la cohérence sémantique.",
                ];
            } else {
                $recommendations[] = [
                    'priority' => 'high',
                    'field'    => 'meta_keywords',
                    'message'  => 'Aucun mot-clé ne se retrouve dans le titre ou la description. Le contenu n\'est pas aligné.',
                ];
            }
        } else {
            $recommendations[] = [
                'priority' => 'medium',
                'field'    => 'meta_keywords',
                'message'  => 'Les mots-clés SEO sont manquants. Ajoutez 3 à 10 mots-clés pertinents.',
            ];
        }

        // ── 4. Open Graph Image — existence on disk (max 10 pts) ───────────
        if ($this->og_image) {
            // Strip leading slash or domain prefix to get the storage-relative path
            $imagePath = ltrim(parse_url($this->og_image, PHP_URL_PATH) ?? $this->og_image, '/');
            // Remove common public prefix if present (e.g. "storage/")
            $storagePath = preg_replace('#^storage/#', '', $imagePath);

            if (Storage::disk('public')->exists($storagePath)) {
                $score += 10;
            } else {
                $score += 2;
                $recommendations[] = [
                    'priority' => 'high',
                    'field'    => 'og_image',
                    'message'  => "L'image OG définie ({$this->og_image}) est introuvable sur le disque. Vérifiez le chemin ou re-uploadez l'image.",
                ];
            }
        } else {
            $recommendations[] = [
                'priority' => 'medium',
                'field'    => 'og_image',
                'message'  => 'L\'image Open Graph (og:image) est manquante. Elle améliore le partage sur les réseaux sociaux.',
            ];
        }

        // Same disk check for twitter_image (no extra points, just a recommendation)
        if ($this->twitter_image) {
            $twitterPath  = ltrim(parse_url($this->twitter_image, PHP_URL_PATH) ?? $this->twitter_image, '/');
            $twitterStore = preg_replace('#^storage/#', '', $twitterPath);
            if (!Storage::disk('public')->exists($twitterStore)) {
                $recommendations[] = [
                    'priority' => 'medium',
                    'field'    => 'twitter_image',
                    'message'  => "L'image Twitter Card définie est introuvable sur le disque. Vérifiez le chemin.",
                ];
            }
        }

        // ── 5. OG Title + Description fallback (max 8 pts) ─────────────────
        if ($this->og_title || $this->meta_title) {
            $score += 4;
        }
        if ($this->og_description || $this->meta_description) {
            $score += 4;
        }

        // ── 6. JSON-LD Structured Data + schema validation (max 12 pts) ────
        if ($this->json_ld_type && $this->json_ld_data) {
            $score += 7;

            // Schema-specific required field validation
            $data            = is_array($this->json_ld_data) ? $this->json_ld_data : [];
            $schemaErrors    = [];

            switch ($this->json_ld_type) {
                case 'Product':
                    foreach (['name', 'description', 'image'] as $field) {
                        if (empty($data[$field])) {
                            $schemaErrors[] = $field;
                        }
                    }
                    break;
                case 'Organization':
                    foreach (['name', 'url'] as $field) {
                        if (empty($data[$field])) {
                            $schemaErrors[] = $field;
                        }
                    }
                    break;
                case 'LocalBusiness':
                    foreach (['name', 'address'] as $field) {
                        if (empty($data[$field])) {
                            $schemaErrors[] = $field;
                        }
                    }
                    break;
            }

            if (empty($schemaErrors)) {
                $score += 5;
            } else {
                $score += 2;
                $recommendations[] = [
                    'priority' => 'medium',
                    'field'    => 'json_ld_data',
                    'message'  => "Données structurées {$this->json_ld_type} incomplètes. Champs manquants : " . implode(', ', $schemaErrors) . '.',
                ];
            }
        } elseif ($this->json_ld_type) {
            $score += 3;
            $recommendations[] = [
                'priority' => 'medium',
                'field'    => 'json_ld_data',
                'message'  => "Le type JSON-LD est défini ({$this->json_ld_type}) mais les données sont vides. Remplissez les champs du schéma.",
            ];
        } else {
            $recommendations[] = [
                'priority' => 'low',
                'field'    => 'json_ld_type',
                'message'  => 'Aucune donnée structurée (JSON-LD) définie. L\'ajout d\'un schéma Schema.org améliore la visibilité dans Google.',
            ];
        }

        // ── 7. Robots directive — penalize noindex on active pages (max 5 pts) ─
        if ($this->meta_robots && str_contains($this->meta_robots, 'index')) {
            if (!str_contains($this->meta_robots, 'noindex')) {
                $score += 5;
            } else {
                // noindex on an active page is a penalty
                $score -= 5;
                $recommendations[] = [
                    'priority' => 'high',
                    'field'    => 'meta_robots',
                    'message'  => 'Cette page active est configurée en noindex. Elle sera exclue des résultats de recherche. Vérifiez si c\'est intentionnel.',
                ];
            }
        }

        // ── 8. Duplicate title/description detection (penalty up to -7 pts) ─
        if ($this->meta_title) {
            $dupTitle = static::active()
                ->where('id', '!=', $this->id)
                ->where('meta_title', $this->meta_title)
                ->exists();

            if ($dupTitle) {
                $score -= 7;
                $recommendations[] = [
                    'priority' => 'high',
                    'field'    => 'meta_title',
                    'message'  => 'Ce titre SEO est identique à celui d\'une autre page active. Les titres dupliqués pénalisent le référencement. Différenciez-les.',
                ];
            }
        }

        if ($this->meta_description) {
            $dupDesc = static::active()
                ->where('id', '!=', $this->id)
                ->where('meta_description', $this->meta_description)
                ->exists();

            if ($dupDesc) {
                $score -= 5;
                $recommendations[] = [
                    'priority' => 'medium',
                    'field'    => 'meta_description',
                    'message'  => 'Cette description SEO est identique à celle d\'une autre page active. Rédigez une description unique pour chaque page.',
                ];
            }
        }

        // ── Clamp score to [0, 100] ─────────────────────────────────────────
        $finalScore = max(0, min(100, $score));

        // Sort recommendations: high → medium → low
        usort($recommendations, function ($a, $b) {
            $order = ['high' => 0, 'medium' => 1, 'low' => 2];
            return ($order[$a['priority']] ?? 9) <=> ($order[$b['priority']] ?? 9);
        });

        // ── Persist on model ────────────────────────────────────────────────
        $this->seo_score       = $finalScore;
        $this->recommendations = $recommendations;
        $this->last_analyzed_at = now();
        $this->save();

        // ── Save to score history table ─────────────────────────────────────
        \DB::table('seo_score_history')->insert([
            'seo_meta_id' => $this->id,
            'score'       => $finalScore,
            'created_at'  => now(),
        ]);

        return $finalScore;
    }

    /**
     * Get resolved meta data with fallbacks (OG falls back to core meta).
     */
    public function getResolvedMeta(): array
    {
        return [
            'meta_title'          => $this->meta_title,
            'meta_description'    => $this->meta_description,
            'meta_keywords'       => $this->meta_keywords,
            'meta_robots'         => $this->meta_robots ?? 'index,follow',
            'og_title'            => $this->og_title ?: $this->meta_title,
            'og_description'      => $this->og_description ?: $this->meta_description,
            'og_image'            => $this->og_image,
            'og_type'             => $this->og_type ?? 'website',
            'og_locale'           => $this->og_locale ?? 'fr_FR',
            'twitter_card'        => $this->twitter_card ?? 'summary_large_image',
            'twitter_title'       => $this->twitter_title ?: ($this->og_title ?: $this->meta_title),
            'twitter_description' => $this->twitter_description ?: ($this->og_description ?: $this->meta_description),
            'twitter_image'       => $this->twitter_image ?: $this->og_image,
            'json_ld_type'        => $this->json_ld_type,
            'json_ld_data'        => $this->json_ld_data,
        ];
    }
}
