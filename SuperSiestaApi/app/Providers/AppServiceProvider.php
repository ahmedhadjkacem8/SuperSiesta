<?php

namespace App\Providers;

use App\Models\BlogPost;
use App\Models\Categorie;
use App\Models\Product;
use App\Models\ProductSize;
use App\Models\Showroom;
use App\Observers\BlogPostObserver;
use App\Observers\CategorieObserver;
use App\Observers\ProductObserver;
use App\Observers\ShowroomObserver;
use App\Services\SeoJsonLdGenerator;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Bind the generator as a singleton so all observers share the same
        // instance and avoid redundant URL config reads.
        $this->app->singleton(SeoJsonLdGenerator::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // ── Model Observers ────────────────────────────────────────────────
        Product::observe(ProductObserver::class);
        Categorie::observe(CategorieObserver::class);
        Showroom::observe(ShowroomObserver::class);
        BlogPost::observe(BlogPostObserver::class);

        // ── ProductSize observer (inline) ──────────────────────────────────
        // When a size/price changes, the parent Product SEO must be regenerated
        // because the JSON-LD Offer block embeds price information.
        ProductSize::created(function (ProductSize $size) {
            $this->resyncProduct($size);
        });

        ProductSize::updated(function (ProductSize $size) {
            $this->resyncProduct($size);
        });

        ProductSize::deleted(function (ProductSize $size) {
            $this->resyncProduct($size);
        });
    }

    /**
     * Re-trigger the ProductObserver sync for the parent product of a
     * ProductSize that just changed.
     */
    protected function resyncProduct(ProductSize $size): void
    {
        $product = $size->product()->with('sizes')->first();
        if ($product) {
            /** @var SeoJsonLdGenerator $generator */
            $generator = $this->app->make(SeoJsonLdGenerator::class);
            $slug      = $product->slug ?: $product->id;
            $generator->sync(
                entity:    $product,
                schemaType: 'Product',
                pageId:    "product_{$slug}",
                pageLabel: "Produit : {$product->name}",
            );
        }
    }
}
