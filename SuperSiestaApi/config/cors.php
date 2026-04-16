<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Laravel CORS Configuration
    |--------------------------------------------------------------------------
    |
    | This configuration allows you to configure the CORS settings for your
    | Laravel API. By default, all origins are allowed.
    |
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie', 'uploads/*'],

    'allowed_methods' => ['*'],
    'allowed_origins' => ['*'],
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],

    'exposed_headers' => ['Content-Type', 'Authorization', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],

    'max_age' => 3600, // 1 hour

    'supports_credentials' => true,
];
