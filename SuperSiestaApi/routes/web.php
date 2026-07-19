<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Response;
use App\Models\SeoMeta;

Route::get('/', function () {
    return view('welcome');
});

/**
 * Serve robots.txt dynamically with Access-Control-Allow-Origin header
 * to allow frontend dashboard to fetch it without CORS issues.
 */
Route::get('/robots.txt', function () {
    $path = public_path('robots.txt');
    // If a custom robots file is stored in public, use it. Otherwise serve standard fallback.
    $content = file_exists($path) ? file_get_contents($path) : "User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /admin/*\nDisallow: /login\nDisallow: /register\nDisallow: /panier\nDisallow: /cart\nDisallow: /profile\n\nSitemap: " . rtrim(env('FRONTEND_URL', 'http://localhost'), '/') . "/sitemap.xml";
    
    return Response::make($content, 200, [
        'Content-Type' => 'text/plain; charset=UTF-8',
        'Access-Control-Allow-Origin' => '*',
        'Access-Control-Allow-Methods' => 'GET, OPTIONS',
    ]);
});

/**
 * Serve sitemap.xml dynamically with Access-Control-Allow-Origin header.
 * Builds the sitemap dynamically from active SeoMeta records.
 */
Route::get('/sitemap.xml', function () {
    $entries = SeoMeta::active()->get();
    $frontUrl = rtrim(env('FRONTEND_URL', 'http://localhost'), '/');

    $xml = '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
    $xml .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";

    // Add home page
    $xml .= "  <url>\n";
    $xml .= "    <loc>{$frontUrl}/</loc>\n";
    $xml .= "    <priority>1.0</priority>\n";
    $xml .= "    <changefreq>daily</changefreq>\n";
    $xml .= "  </url>\n";

    foreach ($entries as $entry) {
        if ($entry->page_identifier === 'global') {
            continue;
        }

        $pathStr = $entry->page_identifier;
        if (str_starts_with($pathStr, 'product_')) {
            $pathStr = 'produit/' . substr($pathStr, 8);
        } elseif (str_starts_with($pathStr, 'categorie_')) {
            $pathStr = 'boutique?categorie=' . urlencode(substr($pathStr, 10));
        } elseif (str_starts_with($pathStr, 'showroom_')) {
            $pathStr = 'showrooms';
        } elseif (str_starts_with($pathStr, 'blog_')) {
            $pathStr = 'blog/' . substr($pathStr, 5);
        }

        $priority = $entry->priority ?? '0.8';
        $changefreq = $entry->changefreq ?? 'weekly';

        $xml .= "  <url>\n";
        $xml .= "    <loc>{$frontUrl}/" . ltrim($pathStr, '/') . "</loc>\n";
        $xml .= "    <priority>{$priority}</priority>\n";
        $xml .= "    <changefreq>{$changefreq}</changefreq>\n";
        $xml .= "  </url>\n";
    }

    $xml .= '</urlset>';

    return Response::make($xml, 200, [
        'Content-Type' => 'application/xml; charset=UTF-8',
        'Access-Control-Allow-Origin' => '*',
        'Access-Control-Allow-Methods' => 'GET, OPTIONS',
    ]);
});
