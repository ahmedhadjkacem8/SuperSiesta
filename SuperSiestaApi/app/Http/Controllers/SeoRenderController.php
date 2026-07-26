<?php

namespace App\Http\Controllers;

use App\Models\SeoMeta;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class SeoRenderController extends Controller
{
    public function render(Request $request, string $slug = null)
    {
        // Reconstitue l'identifiant selon le type de route appelée
        $routeName = $request->route()->getName(); // ex: 'seo.produit'

        $identifier = match ($routeName) {
            'seo.home'       => 'home',
            'seo.about'      => 'a-propos',
            'seo.contact'    => 'contact',
            'seo.blog_index' => 'blog',
            'seo.faq'        => 'faq',
            'seo.produit'    => 'product_' . $slug,
            'seo.categorie'  => 'categorie_' . $slug,
            'seo.blog'       => 'blog_' . $slug,
            'seo.showrooms'  => 'showrooms',
            'seo.boutique'   => 'boutique',
            default          => 'global',
        };

        // Support deep-linking for specific showrooms via query parameters (e.g. ?showroom=showroom_oran or ?id=uuid)
        // Enables social crawlers and SEO debug tools to test/preview individual showroom metadata.
        if ($routeName === 'seo.showrooms' && ($request->has('showroom') || $request->has('id'))) {
            $param = $request->query('showroom') ?? $request->query('id');
            $targetId = str_starts_with($param, 'showroom_') ? $param : 'showroom_' . \Illuminate\Support\Str::slug($param);

            $specificSeo = SeoMeta::where('page_identifier', $targetId)
                ->orWhere('seoable_id', $param)
                ->first();

            if ($specificSeo) {
                $identifier = $specificSeo->page_identifier;
            }
        }

        // og:type par défaut selon le type de page (surchargé plus bas si l'entrée en base en définit un)
        $defaultOgType = match ($routeName) {
            'seo.produit' => 'product',
            'seo.blog'    => 'article',
            default       => 'website',
        };

        // Cache court (5 min) pour éviter une requête DB à chaque hit de bot
        $seo = Cache::remember("seo_render:{$identifier}", 300, function () use ($identifier) {
            return SeoMeta::where('page_identifier', $identifier)->first();
        });

        // 404 propre pour les pages entity supprimées (produit/blog/catégorie qui n'existe plus)
        // — évite de faire croire au bot qu'une page morte existe toujours avec un 200.
        $isEntityRoute = in_array($routeName, ['seo.produit', 'seo.categorie', 'seo.blog']);
        if (!$seo && $isEntityRoute) {
            abort(404);
        }

        // Fallback si aucune entrée trouvée (pages statiques sans entrée SEO configurée)
        $title       = $seo?->og_title ?? 'Super Siesta';
        $description = $seo?->og_description ?? 'Super Siesta matelas';
        $image       = $seo?->og_image ?? '/default-og-image.jpg';
        $ogType      = $seo?->og_type ?? $defaultOgType;
        $ogLocale    = $seo?->og_locale ?? 'fr_FR';
        $robots      = $seo?->meta_robots ?? 'index, follow';

        // Build the public frontend URL using FRONTEND_URL from env, falling back to request host
        $frontUrl = rtrim(env('FRONTEND_URL', $request->getSchemeAndHttpHost()), '/');
        $url      = $frontUrl . $request->getPathInfo();

        // Bug fix : og_image / twitter_image stockés en base sont souvent des chemins
        // relatifs ("/storage/seo/xxx.jpg") — Facebook/Twitter exigent une URL absolue.
        if ($image && !str_starts_with($image, 'http')) {
            $image = $frontUrl . '/' . ltrim($image, '/');
        }

        // Sécurité : échapper le contenu injecté dans le HTML
        $title       = e($title);
        $description = e($description);
        $image       = e($image);
        $ogType      = e($ogType);
        $ogLocale    = e($ogLocale);
        $robots      = e($robots);
        $url         = e($url);

        // ──────────────────────────────────────────────────────────────────
        // JSON-LD — special handling for /showrooms : ItemList of LocalBusiness
        // Google rich results recognise ItemList + LocalBusiness to index
        // multiple physical locations from a single page.
        // ──────────────────────────────────────────────────────────────────
        $jsonLdScript = '';

        if ($routeName === 'seo.showrooms') {
            $jsonLdScript = $this->buildShowroomsJsonLd($frontUrl);
        } elseif ($seo && $seo->json_ld_data) {
            $jsonLd = json_encode(
                $seo->json_ld_data,
                JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
            );
            $jsonLdScript = "<script type=\"application/ld+json\">{$jsonLd}</script>";
        }

        $html = <<<HTML
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8" />
    <title>{$title}</title>
    <meta name="description" content="{$description}" />
    <meta name="robots" content="{$robots}" />
    <link rel="canonical" href="{$url}" />

    <meta property="og:title" content="{$title}" />
    <meta property="og:description" content="{$description}" />
    <meta property="og:image" content="{$image}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:url" content="{$url}" />
    <meta property="og:type" content="{$ogType}" />
    <meta property="og:locale" content="{$ogLocale}" />
    <meta property="og:site_name" content="Super Siesta" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="{$title}" />
    <meta name="twitter:description" content="{$description}" />
    <meta name="twitter:image" content="{$image}" />
    {$jsonLdScript}
</head>
<body></body>
</html>
HTML;

        return response($html, 200)->header('Content-Type', 'text/html; charset=UTF-8');
    }

    /**
     * Build a JSON-LD ItemList containing every showroom as a LocalBusiness.
     * Cached for 10 minutes to avoid querying the showroom table on every bot hit.
     */
    protected function buildShowroomsJsonLd(string $frontUrl): string
    {
        $showrooms = Cache::remember('seo_render:showrooms_list', 600, function () {
            return \App\Models\Showroom::orderBy('sort_order')->get();
        });

        if ($showrooms->isEmpty()) {
            return '';
        }

        $storageUrl = rtrim(config('app.url'), '/') . '/storage';

        $items = [];
        $position = 0;

        foreach ($showrooms as $sr) {
            $position++;

            $business = [
                '@type'   => 'LocalBusiness',
                'name'    => $sr->name ?? 'Super Siesta Showroom',
                'url'     => "{$frontUrl}/showrooms",
                'address' => [
                    '@type'           => 'PostalAddress',
                    'streetAddress'   => $sr->address ?? '',
                    'addressLocality' => $sr->city ?? '',
                    'addressCountry'  => 'DZ',
                ],
            ];

            if (!empty($sr->phone)) {
                $business['telephone'] = $sr->phone;
            }
            if (!empty($sr->email)) {
                $business['email'] = $sr->email;
            }
            if (!empty($sr->lat) && !empty($sr->lng)) {
                $business['geo'] = [
                    '@type'     => 'GeoCoordinates',
                    'latitude'  => (float) $sr->lat,
                    'longitude' => (float) $sr->lng,
                ];
            }
            if (!empty($sr->google_maps_url)) {
                $business['hasMap'] = $sr->google_maps_url;
            }

            // Opening hours
            $days = is_array($sr->opening_days) ? $sr->opening_days : [];
            if (!empty($days) && (!empty($sr->opening_hours_from) || !empty($sr->opening_hours_until))) {
                $opens  = $sr->opening_hours_from  ?? '09:00';
                $closes = $sr->opening_hours_until ?? '18:00';
                $business['openingHoursSpecification'] = array_map(fn($day) => [
                    '@type'     => 'OpeningHoursSpecification',
                    'dayOfWeek' => "https://schema.org/{$day}",
                    'opens'     => $opens,
                    'closes'    => $closes,
                ], $days);
            }

            // Image
            if (!empty($sr->image_url)) {
                $img = $sr->image_url;
                if (!str_starts_with($img, 'http')) {
                    $img = $storageUrl . '/' . ltrim($img, '/');
                }
                $business['image'] = $img;
            }

            $items[] = [
                '@type'    => 'ListItem',
                'position' => $position,
                'item'     => $business,
            ];
        }

        $itemList = [
            '@context'        => 'https://schema.org',
            '@type'           => 'ItemList',
            'name'            => 'Nos Showrooms — Super Siesta',
            'numberOfItems'   => count($items),
            'itemListElement' => $items,
        ];

        $json = json_encode($itemList, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

        return "<script type=\"application/ld+json\">{$json}</script>";
    }
} 