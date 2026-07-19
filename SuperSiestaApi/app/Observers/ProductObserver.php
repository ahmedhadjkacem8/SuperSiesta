<?php

namespace App\Observers;

use App\Models\Product;
use App\Services\SeoJsonLdGenerator;

/**
 * ProductObserver
 *
 * Fires on every CRUD event for App\Models\Product and keeps the associated
 * SeoMeta record (JSON-LD + meta fields) perfectly in sync.
 *
 * Schema.org type used: Product
 * page_identifier pattern: "product_{slug}"
 */
class ProductObserver
{
    public function __construct(protected SeoJsonLdGenerator $generator) {}

    // ── Write events ──────────────────────────────────────────────────────

    public function created(Product $product): void
    {
        $this->sync($product);
    }

    public function updated(Product $product): void
    {
        // Reload sizes in case they changed
        $product->load('sizes');
        $this->sync($product);
    }

    // ── Delete event ──────────────────────────────────────────────────────

    public function deleted(Product $product): void
    {
        $this->generator->delete($this->pageId($product));
    }

    // ── Helpers ───────────────────────────────────────────────────────────

    protected function sync(Product $product): void
    {
        // Ensure sizes are available for price extraction
        if (!$product->relationLoaded('sizes')) {
            $product->load('sizes');
        }

        $this->generator->sync(
            entity:    $product,
            schemaType: 'Product',
            pageId:    $this->pageId($product),
            pageLabel: "Produit : {$product->name}",
        );
    }

    protected function pageId(Product $product): string
    {
        return 'product_' . ($product->slug ?: $product->id);
    }
}
