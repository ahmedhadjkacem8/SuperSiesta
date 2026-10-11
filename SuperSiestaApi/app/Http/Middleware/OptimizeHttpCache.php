<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\Response;

/**
 * Optimize HTTP caching for API responses and static files
 * Improves frontend performance with browser caching
 */
class OptimizeHttpCache
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // Resized images have stable request URLs, so allow revalidation after one day.
        if ($request->is('api/media/*')) {
            $response->headers->set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
        }
        // Public files (images, videos, assets) - cache for 1 year (immutable)
        elseif ($this->isPublicFile($request)) {
            $response->headers->set('Cache-Control', 'public, max-age=31536000, immutable');
            if (!$response instanceof BinaryFileResponse) {
                $response->headers->set('ETag', md5((string) $response->getContent()));
            }
        }
        // API GET requests for dynamic entities - don't cache
        elseif ($request->isMethod('GET') && ($request->is('api/quotes*') || $request->is('api/orders*') || $request->is('api/invoices*') || $request->is('api/products*') || $request->is('api/clients*'))) {
            $response->headers->set('Cache-Control', 'no-cache, no-store, must-revalidate');
        }
        // Other API GET requests - short cache (conditional revalidation)
        elseif ($request->isMethod('GET') && $request->is('api/*')) {
            $response->headers->set('Cache-Control', 'public, max-age=60, must-revalidate');
            $response->headers->set('Vary', 'Accept, Authorization');
        }
        // API POST/PUT/DELETE - don't cache
        else {
            $response->headers->set('Cache-Control', 'no-cache, no-store, must-revalidate');
        }

        // Add compression hint
        $response->headers->set('Vary', 'Accept-Encoding');

        return $response;
    }

    private function isPublicFile(Request $request): bool
    {
        $publicExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'mp4', 'webm', 'css', 'js'];
        $path = strtolower($request->path());

        foreach ($publicExtensions as $ext) {
            if (str_ends_with($path, '.' . $ext)) {
                return true;
            }
        }

        return false;
    }
}
