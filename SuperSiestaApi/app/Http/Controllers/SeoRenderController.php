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

        // JSON-LD (Schema.org) — permet les rich snippets Google (prix, stock, avis, breadcrumb...)
        $jsonLdScript = '';
        if ($seo && $seo->json_ld_data) {
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
} 