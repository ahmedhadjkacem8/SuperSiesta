<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ApiRateLimiting
{
    public function handle(Request $request, Closure $next): Response
    {
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
            return response()->json([
                'message' => 'Too many requests. Please try again later.',
                'retry_after' => max(1, $resetTime - $now->timestamp),
            ], 429)
            ->header('X-RateLimit-Limit', $limit)
            ->header('X-RateLimit-Remaining', 0)
            ->header('X-RateLimit-Reset', $resetTime)
            ->header('Retry-After', max(1, $resetTime - $now->timestamp));
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
        return $response
            ->header('X-RateLimit-Limit', $limit)
            ->header('X-RateLimit-Remaining', max(0, $limit - $attempts))
            ->header('X-RateLimit-Reset', $resetTime);
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
