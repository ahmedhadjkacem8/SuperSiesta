<?php

namespace App\Services;

use App\Models\SeoMeta;
use Illuminate\Support\Facades\Storage;

/**
 * SeoJsonLdGenerator
 *
 * Central service that builds both the JSON-LD structured data block AND the
 * basic SEO meta fields (title, description, keywords, og_image) for a given
 * Schema.org type + entity.
 *
 * Called automatically by Laravel Observers whenever a watched entity is
 * created, updated or deleted, ensuring that the SeoMeta record always mirrors
 * the live data on the public page.
 */
class SeoJsonLdGenerator
{
    /**
     * The public front-end base URL (used to build canonical / entity URLs).
     * Reads FRONTEND_URL env key, falls back to APP_URL.
     */
    protected string $frontUrl;

    /**
     * The API / storage base URL used to resolve asset paths.
     */
    protected string $storageUrl;

    public function __construct()
    {
        $this->frontUrl   = rtrim(env('FRONTEND_URL', config('app.url')), '/');
        $this->storageUrl = rtrim(config('app.url'), '/') . '/storage';
    }

    // ──────────────────────────────────────────────────────────────────────
    // Public entry points
    // ──────────────────────────────────────────────────────────────────────

    /**
     * Synchronise (create or update) the SeoMeta for a given entity using a
     * known Schema.org type.  Recalculates the score after saving.
     *
     * @param  object  $entity       The Eloquent model instance.
     * @param  string  $schemaType   One of: Product, CollectionPage, LocalBusiness, Article, Organization, WebPage
     * @param  string  $pageId       Unique page_identifier for this SeoMeta row.
     * @param  string  $pageLabel    Human-readable label for the admin list.
     * @param  bool    $force        If true, overwrites existing manual meta values.
     */
    public function sync(object $entity, string $schemaType, string $pageId, string $pageLabel, bool $force = false): void
    {
        $meta = $this->generateMetaFields($entity, $schemaType);
        $ld   = $this->generateJsonLd($entity, $schemaType, $pageId);

        /** @var SeoMeta $seoMeta */
        $seoMeta = SeoMeta::firstOrNew(['page_identifier' => $pageId]);

        // Only overwrite auto-generated fields if no manual override has been set
        // or if the record is new, or if force is true.
        $isNew = !$seoMeta->exists;

        $seoMeta->page_identifier = $pageId;
        $seoMeta->page_label      = $pageLabel;
        $seoMeta->seoable_type    = get_class($entity);
        $seoMeta->seoable_id      = $entity->id;
        $seoMeta->is_active       = true;
        $seoMeta->json_ld_type    = $schemaType;
        $seoMeta->json_ld_data    = $ld;

        // For new records always write meta fields; for existing ones preserve
        // manual edits (any non-null value counts as "manually set"), unless forced.
        if ($isNew || $force || empty($seoMeta->meta_title)) {
            $seoMeta->meta_title = $meta['meta_title'];
        }
        if ($isNew || $force || empty($seoMeta->meta_description)) {
            $seoMeta->meta_description = $meta['meta_description'];
        }
        if ($isNew || $force || empty($seoMeta->meta_keywords)) {
            $seoMeta->meta_keywords = $meta['meta_keywords'];
        }
        if ($isNew || $force || empty($seoMeta->og_image)) {
            $seoMeta->og_image     = $meta['og_image'];
            $seoMeta->twitter_image = $meta['og_image'];
        }

        // Always set OG/Twitter titles + descriptions from the live data so social
        // previews stay in sync even when the admin has customised the main title.
        $seoMeta->og_title            = $seoMeta->meta_title;
        $seoMeta->og_description      = $seoMeta->meta_description;
        $seoMeta->twitter_title       = $seoMeta->meta_title;
        $seoMeta->twitter_description = $seoMeta->meta_description;

        $seoMeta->save();

        // Recalculate score (also persists history + recommendations)
        $seoMeta->calculateScore();
    }

    /**
     * Delete the SeoMeta entry for a given page_identifier when the entity
     * is hard-deleted.  Soft-deletion is NOT performed — the row is removed
     * so that orphan records don't accumulate.
     */
    public function delete(string $pageId): void
    {
        SeoMeta::where('page_identifier', $pageId)->delete();
    }

    // ──────────────────────────────────────────────────────────────────────
    // JSON-LD builders
    // ──────────────────────────────────────────────────────────────────────

    /**
     * Dispatch to the correct builder based on schema type.
     */
    public function generateJsonLd(object $entity, string $schemaType, string $pageId): array
    {
        return match ($schemaType) {
            'Product'        => $this->buildProduct($entity, $pageId),
            'CollectionPage' => $this->buildCollectionPage($entity, $pageId),
            'LocalBusiness'  => $this->buildLocalBusiness($entity, $pageId),
            'Article'        => $this->buildArticle($entity, $pageId),
            'Organization'   => $this->buildOrganization($entity, $pageId),
            'WebPage'        => $this->buildWebPage($entity, $pageId),
            'FAQPage'        => $this->buildFaqPage($entity, $pageId),
            'ContactPage'    => $this->buildContactPage($entity, $pageId),
            default          => $this->buildWebPage($entity, $pageId),
        };
    }

    // ──────────────────────────────────────────────────────────────────────
    // Meta field generators (title, description, keywords, og_image)
    // ──────────────────────────────────────────────────────────────────────

    public function generateMetaFields(object $entity, string $schemaType): array
    {
        return match ($schemaType) {
            'Product'        => $this->metaProduct($entity),
            'CollectionPage' => $this->metaCollectionPage($entity),
            'LocalBusiness'  => $this->metaLocalBusiness($entity),
            'Article'        => $this->metaArticle($entity),
            'Organization'   => $this->metaOrganization($entity),
            'WebPage'        => $this->metaWebPage($entity),
            'FAQPage'        => $this->metaWebPage($entity),
            'ContactPage'    => $this->metaWebPage($entity),
            default          => $this->metaWebPage($entity),
        };
    }

    // ──────────────────────────────────────────────────────────────────────
    // Product (App\Models\Product)
    // ──────────────────────────────────────────────────────────────────────

    protected function buildProduct(object $p, string $pageId): array
    {
        $url       = "{$this->frontUrl}/produit/{$p->slug}";
        $imageUrl  = $this->resolveImageUrl($p->image ?? null);
        $sizes     = $p->relationLoaded('sizes') ? $p->sizes : (method_exists($p, 'sizes') ? $p->sizes()->get() : collect());

        $offers = $sizes->map(function ($size) use ($url) {
            $offer = [
                '@type'         => 'Offer',
                'url'           => $url,
                'priceCurrency' => 'DZD',
                'price'         => (string) ($size->price ?? '0'),
                'availability'  => 'https://schema.org/InStock',
                'name'          => $size->label ?? null,
            ];
            if (!empty($size->original_price) && $size->original_price > $size->price) {
                $offer['priceValidUntil'] = now()->addYear()->toDateString();
            }
            return array_filter($offer);
        })->values()->toArray();

        $ld = [
            '@context'    => 'https://schema.org',
            '@type'       => 'Product',
            'name'        => $p->name ?? '',
            'description' => $p->description ?? '',
            'url'         => $url,
            'sku'         => (string) $p->id,
        ];

        if ($imageUrl) {
            $ld['image'] = $imageUrl;
        }

        if (!empty($p->badge)) {
            $ld['award'] = $p->badge;
        }

        if (!empty($offers)) {
            $ld['offers'] = count($offers) === 1 ? $offers[0] : $offers;
        }

        if (!empty($p->grammage)) {
            $ld['weight'] = [
                '@type'    => 'QuantitativeValue',
                'value'    => $p->grammage,
                'unitCode' => 'GRM',
            ];
        }

        // Brand defaults to app name
        $ld['brand'] = [
            '@type' => 'Brand',
            'name'  => config('app.name', 'Super Siesta'),
        ];

        return $ld;
    }

    protected function metaProduct(object $p): array
    {
        $sizes       = $p->relationLoaded('sizes') ? $p->sizes : (method_exists($p, 'sizes') ? $p->sizes()->get() : collect());
        $lowestPrice = $sizes->min('price');
        $priceHint   = $lowestPrice ? " - À partir de " . number_format($lowestPrice, 0, ',', ' ') . " DA" : '';

        $title       = mb_substr(($p->name ?? '') . $priceHint . ' | Super Siesta', 0, 65);
        $description = mb_substr(($p->description ?? "Découvrez {$p->name} chez Super Siesta. Qualité premium, livraison rapide en Algérie."), 0, 155);
        $keywords    = implode(', ', array_filter([
            $p->name ?? '',
            $p->categorie ?? '',
            $p->gamme ?? '',
            $p->fermete ?? '',
            'matelas',
            'Super Siesta',
            'Algérie',
        ]));
        $image = $this->resolveImageUrl($p->image ?? null);

        return compact('title', 'description', 'keywords', 'image') + [
            'meta_title'       => $title,
            'meta_description' => $description,
            'meta_keywords'    => $keywords,
            'og_image'         => $image,
        ];
    }

    // ──────────────────────────────────────────────────────────────────────
    // CollectionPage (App\Models\Categorie)
    // ──────────────────────────────────────────────────────────────────────

    protected function buildCollectionPage(object $cat, string $pageId): array
    {
        $url = "{$this->frontUrl}/boutique?categorie=" . urlencode($cat->label ?? '');

        return [
            '@context'    => 'https://schema.org',
            '@type'       => 'CollectionPage',
            'name'        => ($cat->label ?? '') . ' | Super Siesta',
            'description' => $cat->description ?? "Découvrez notre collection {$cat->label}",
            'url'         => $url,
        ];
    }

    protected function metaCollectionPage(object $cat): array
    {
        $title       = mb_substr(($cat->label ?? '') . ' — Collection Super Siesta', 0, 65);
        $description = mb_substr($cat->description ?? "Parcourez notre sélection de produits dans la catégorie {$cat->label}. Qualité et confort garantis.", 0, 155);
        $keywords    = implode(', ', array_filter([$cat->label ?? '', 'matelas', 'literie', 'Super Siesta', 'Algérie']));
        $image       = $this->resolveImageUrl($cat->image ?? null);

        return [
            'meta_title'       => $title,
            'meta_description' => $description,
            'meta_keywords'    => $keywords,
            'og_image'         => $image,
        ];
    }

    // ──────────────────────────────────────────────────────────────────────
    // LocalBusiness (App\Models\Showroom)
    // ──────────────────────────────────────────────────────────────────────

    protected function buildLocalBusiness(object $sr, string $pageId): array
    {
        $ld = [
            '@context' => 'https://schema.org',
            '@type'    => 'LocalBusiness',
            'name'     => $sr->name ?? 'Super Siesta Showroom',
            'url'      => "{$this->frontUrl}/showrooms",
            'address'  => [
                '@type'           => 'PostalAddress',
                'streetAddress'   => $sr->address ?? '',
                'addressLocality' => $sr->city ?? '',
                'addressCountry'  => 'DZ',
            ],
        ];

        if (!empty($sr->phone)) {
            $ld['telephone'] = $sr->phone;
        }
        if (!empty($sr->email)) {
            $ld['email'] = $sr->email;
        }
        if (!empty($sr->lat) && !empty($sr->lng)) {
            $ld['geo'] = [
                '@type'     => 'GeoCoordinates',
                'latitude'  => (float) $sr->lat,
                'longitude' => (float) $sr->lng,
            ];
        }
        if (!empty($sr->google_maps_url)) {
            $ld['hasMap'] = $sr->google_maps_url;
        }

        $days = is_array($sr->opening_days) ? $sr->opening_days : [];
        if (!empty($days) && (!empty($sr->opening_hours_from) || !empty($sr->opening_hours_until))) {
            $opens  = $sr->opening_hours_from  ?? '09:00';
            $closes = $sr->opening_hours_until ?? '18:00';
            $ld['openingHoursSpecification'] = array_map(fn($day) => [
                '@type'     => 'OpeningHoursSpecification',
                'dayOfWeek' => "https://schema.org/{$day}",
                'opens'     => $opens,
                'closes'    => $closes,
            ], $days);
        }

        $imageUrl = $this->resolveImageUrl($sr->image_url ?? null);
        if ($imageUrl) {
            $ld['image'] = $imageUrl;
        }

        return $ld;
    }

    protected function metaLocalBusiness(object $sr): array
    {
        $name        = $sr->name ?? 'Super Siesta';
        $city        = $sr->city ?? '';
        $title       = mb_substr("Showroom {$name}" . ($city ? " — {$city}" : '') . ' | Super Siesta', 0, 65);
        $description = mb_substr("Visitez notre showroom {$name}" . ($city ? " à {$city}" : '') . '. Retrouvez nos matelas, sommiers et literie en exposition. Conseil personnalisé sur place.', 0, 155);
        $keywords    = implode(', ', array_filter([$name, $city, 'showroom', 'matelas', 'literie', 'Super Siesta']));
        $image       = $this->resolveImageUrl($sr->image_url ?? null);

        return [
            'meta_title'       => $title,
            'meta_description' => $description,
            'meta_keywords'    => $keywords,
            'og_image'         => $image,
        ];
    }

    // ──────────────────────────────────────────────────────────────────────
    // Article (App\Models\BlogPost)
    // ──────────────────────────────────────────────────────────────────────

    protected function buildArticle(object $post, string $pageId): array
    {
        $url       = "{$this->frontUrl}/blog/{$post->slug}";
        $imageUrl  = $this->resolveImageUrl($post->image_url ?? null);
        $published = $post->published_at?->toIso8601String() ?? now()->toIso8601String();

        $ld = [
            '@context'         => 'https://schema.org',
            '@type'            => 'Article',
            'headline'         => $post->title ?? '',
            'description'      => $post->excerpt ?? mb_substr(strip_tags($post->content ?? ''), 0, 160),
            'url'              => $url,
            'datePublished'    => $published,
            'dateModified'     => $post->updated_at?->toIso8601String() ?? $published,
            'author'           => [
                '@type' => 'Organization',
                'name'  => config('app.name', 'Super Siesta'),
            ],
            'publisher'        => [
                '@type' => 'Organization',
                'name'  => config('app.name', 'Super Siesta'),
                'logo'  => [
                    '@type' => 'ImageObject',
                    'url'   => "{$this->frontUrl}/logo.png",
                ],
            ],
        ];

        if ($imageUrl) {
            $ld['image'] = [
                '@type' => 'ImageObject',
                'url'   => $imageUrl,
            ];
        }

        if (!empty($post->tags) && is_array($post->tags)) {
            $ld['keywords'] = implode(', ', $post->tags);
        }

        return $ld;
    }

    protected function metaArticle(object $post): array
    {
        $title       = mb_substr(($post->title ?? '') . ' | Blog Super Siesta', 0, 65);
        $description = mb_substr($post->excerpt ?? mb_substr(strip_tags($post->content ?? ''), 0, 155), 0, 155);
        $keywords    = is_array($post->tags) ? implode(', ', $post->tags) : ($post->tags ?? '');
        $image       = $this->resolveImageUrl($post->image_url ?? null);

        return [
            'meta_title'       => $title,
            'meta_description' => $description,
            'meta_keywords'    => $keywords,
            'og_image'         => $image,
        ];
    }

    // ──────────────────────────────────────────────────────────────────────
    // Organization (generic / global fallback)
    // ──────────────────────────────────────────────────────────────────────

    protected function buildOrganization(object $entity, string $pageId): array
    {
        return [
            '@context'   => 'https://schema.org',
            '@type'      => 'Organization',
            'name'       => config('app.name', 'Super Siesta'),
            'url'        => $this->frontUrl,
            'logo'       => "{$this->frontUrl}/logo.png",
            'sameAs'     => [],
            'contactPoint' => [
                '@type'             => 'ContactPoint',
                'contactType'       => 'customer service',
                'availableLanguage' => ['French', 'Arabic'],
            ],
        ];
    }

    protected function metaOrganization(object $entity): array
    {
        return [
            'meta_title'       => 'Super Siesta — Literie & Matelas Premium en Algérie',
            'meta_description' => 'Super Siesta, spécialiste de la literie haut de gamme en Algérie. Matelas, sommiers et accessoires de sommeil livrés partout en Algérie.',
            'meta_keywords'    => 'Super Siesta, matelas Algérie, literie, sommier, matelas orthopédique, confort de sommeil',
            'og_image'         => null,
        ];
    }

    // ──────────────────────────────────────────────────────────────────────
    // WebPage (generic static pages)
    // ──────────────────────────────────────────────────────────────────────

    protected function buildWebPage(object $entity, string $pageId): array
    {
        $name = property_exists($entity, 'name') ? $entity->name
              : (property_exists($entity, 'title') ? $entity->title : ucfirst($pageId));

        return [
            '@context' => 'https://schema.org',
            '@type'    => 'WebPage',
            'name'     => $name,
            'url'      => "{$this->frontUrl}/{$pageId}",
        ];
    }

    protected function metaWebPage(object $entity): array
    {
        $name = property_exists($entity, 'name') ? $entity->name
              : (property_exists($entity, 'title') ? $entity->title : 'Super Siesta');
        return [
            'meta_title'       => mb_substr("{$name} | Super Siesta", 0, 65),
            'meta_description' => "Découvrez {$name} sur Super Siesta, votre spécialiste de la literie en Algérie.",
            'meta_keywords'    => implode(', ', array_filter([$name, 'Super Siesta', 'Algérie'])),
            'og_image'         => null,
        ];
    }

    // ──────────────────────────────────────────────────────────────────────
    // FAQPage / ContactPage (minimal, no entity-specific data)
    // ──────────────────────────────────────────────────────────────────────

    protected function buildFaqPage(object $entity, string $pageId): array
    {
        return [
            '@context' => 'https://schema.org',
            '@type'    => 'FAQPage',
            'name'     => 'Questions Fréquentes | Super Siesta',
            'url'      => "{$this->frontUrl}/faq",
            'mainEntity' => [],
        ];
    }

    protected function buildContactPage(object $entity, string $pageId): array
    {
        return [
            '@context' => 'https://schema.org',
            '@type'    => 'ContactPage',
            'name'     => 'Contactez-nous | Super Siesta',
            'url'      => "{$this->frontUrl}/contact",
        ];
    }

    // ──────────────────────────────────────────────────────────────────────
    // Helpers
    // ──────────────────────────────────────────────────────────────────────

    /**
     * Resolve a raw stored path (relative storage path or full URL) to an
     * absolute public URL suitable for JSON-LD / OG meta.
     */
    protected function resolveImageUrl(?string $path): ?string
    {
        if (empty($path)) {
            return null;
        }

        // Already a full URL
        if (filter_var($path, FILTER_VALIDATE_URL)) {
            return $path;
        }

        // Strip leading slash
        $clean = ltrim($path, '/');

        // Paths stored as "products/xxx.jpg" → served from /storage/products/xxx.jpg
        if (Storage::disk('public')->exists($clean)) {
            return "{$this->storageUrl}/{$clean}";
        }

        // Some paths may be stored without the "storage/" prefix already stripped
        $withoutStorage = preg_replace('#^storage/#', '', $clean);
        if (Storage::disk('public')->exists($withoutStorage)) {
            return "{$this->storageUrl}/{$withoutStorage}";
        }

        // Fallback: return as-is prefixed by storage URL
        return "{$this->storageUrl}/{$clean}";
    }
}
