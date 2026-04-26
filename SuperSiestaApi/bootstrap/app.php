<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        api: __DIR__.'/../routes/api.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->trustProxies(at: '*');
        
        $middleware->validateCsrfTokens(except: [
            'api/*',
        ]);
        $middleware->statefulApi();
        
        $middleware->api(prepend: [
            \App\Http\Middleware\HandleCors::class,
            \App\Http\Middleware\SecurityHeaders::class,
            \App\Http\Middleware\ApiRateLimiting::class,
            \App\Http\Middleware\OptimizeHttpCache::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
