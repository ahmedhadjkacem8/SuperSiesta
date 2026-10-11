<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ApiRateLimiting
{
    public function handle(Request $request, Closure $next): Response
    {
        // Temporarily disable rate limiting for authentication endpoints
        // so multiple login attempts are allowed while debugging.
        if ($request->is('api/auth/*')) {
            return $next($request);
        }

        // Get current timestamp
        $now = now();
        $key = $this->resolveRequestSignature($request);

        // Different limits for different endpoints
        if ($request->is('api/auth/*')) {
            // Strict limit on auth endpoints: 5 attempts per minute
            $limit = 5;
            $decay = 60;
        } elseif ($request->is('api/uploads/*') || $request->is('api/files/*')) {
            // Strict limit on file operations: 10 per minute
            $limit = 10;
            $decay = 60;
        } else {
            // General API limit: 60 per minute
            $limit = 60;
            $decay = 60;
        }

        // Store attempt count in session/cache
        $attempts = $this->getAttempts($key);
        $resetTime = $this->getResetTime($key) ?? $now->addSeconds($decay)->timestamp;

        // Check if rate limit exceeded
        if ($attempts >= $limit && $now->timestamp < $resetTime) {
            $response = response()->json([
                'message' => 'Too many requests. Please try again later.',
                'retry_after' => max(1, $resetTime - $now->timestamp),
            ], 429);
            $response->headers->set('X-RateLimit-Limit', (string) $limit);
            $response->headers->set('X-RateLimit-Remaining', '0');
            $response->headers->set('X-RateLimit-Reset', (string) $resetTime);
            $response->headers->set('Retry-After', (string) max(1, $resetTime - $now->timestamp));
            return $response;
        }

        // Reset counter if expired
        if ($now->timestamp >= $resetTime) {
            $this->clearAttempts($key);
            $attempts = 0;
            $resetTime = $now->addSeconds($decay)->timestamp;
        }

        // Increment attempt counter
        $attempts++;
        session([$key => $attempts], $decay);

        // Continue to next middleware
        $response = $next($request);

        // Add rate limit headers
        $response->headers->set('X-RateLimit-Limit', (string) $limit);
        $response->headers->set('X-RateLimit-Remaining', (string) max(0, $limit - $attempts));
        $response->headers->set('X-RateLimit-Reset', (string) $resetTime);
        return $response;
    }

    private function resolveRequestSignature(Request $request): string
    {
        // Use IP and path as key, or user ID if authenticated
        if ($request->user()) {
            return 'rate_limit:' . $request->user()->id . ':' . $request->path();
        }

        return 'rate_limit:' . $request->ip() . ':' . $request->path();
    }

    private function getAttempts(string $key): int
    {
        return session($key, 0);
    }

    private function getResetTime(string $key): ?int
    {
        $resetKey = $key . ':reset';
        return session($resetKey);
    }

    private function clearAttempts(string $key): void
    {
        session()->forget([$key, $key . ':reset']);
    }
}
