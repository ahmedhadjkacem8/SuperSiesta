<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
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

        // Public files (images, videos, assets) - cache for 1 year (immutable)
        if ($this->isPublicFile($request)) {
            $response->header('Cache-Control', 'public, max-age=31536000, immutable');
            $response->header('ETag', md5($response->getContent()));
        }
        // API GET requests for dynamic entities - don't cache
        elseif ($request->isMethod('GET') && ($request->is('api/quotes*') || $request->is('api/orders*') || $request->is('api/invoices*') || $request->is('api/products*') || $request->is('api/clients*'))) {
            $response->header('Cache-Control', 'no-cache, no-store, must-revalidate');
        }
        // Other API GET requests - short cache (conditional revalidation)
        elseif ($request->isMethod('GET') && $request->is('api/*')) {
            $response->header('Cache-Control', 'public, max-age=60, must-revalidate');
            $response->header('Vary', 'Accept, Authorization');
        }
        // API POST/PUT/DELETE - don't cache
        else {
            $response->header('Cache-Control', 'no-cache, no-store, must-revalidate');
        }

        // Add compression hint
        $response->header('Vary', 'Accept-Encoding');

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
