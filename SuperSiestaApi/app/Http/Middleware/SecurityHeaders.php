<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // Prevent clickjacking attacks
        $response->headers->set('X-Frame-Options', 'DENY');

        // Prevent MIME-type sniffing
        $response->headers->set('X-Content-Type-Options', 'nosniff');

        // Enable XSS protection (older browsers)
        $response->headers->set('X-XSS-Protection', '1; mode=block');

        // Force HTTPS in production
        if (app()->environment('production')) {
            $response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
        }

        // Content Security Policy - restrict to same origin
        $response->headers->set('Content-Security-Policy',
            "default-src 'self'; " .
            "script-src 'self'; " .
            "style-src 'self' 'unsafe-inline'; " .
            "img-src 'self' data: https:; " .
            "media-src 'self'; " .
            "font-src 'self'; " .
            "connect-src 'self'; " .
            "frame-ancestors 'none'; " .
            "base-uri 'self'; " .
            "form-action 'self'"
        );

        // Referrer Policy
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');

        // Permissions Policy (formerly Feature Policy)
        $response->headers->set('Permissions-Policy',
            'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()'
        );

        return $response;
    }
}
