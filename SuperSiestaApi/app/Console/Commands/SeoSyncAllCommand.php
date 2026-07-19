<?php

namespace App\Console\Commands;

use App\Models\BlogPost;
use App\Models\Categorie;
use App\Models\Product;
use App\Models\Showroom;
use App\Services\SeoJsonLdGenerator;
use Illuminate\Console\Command;

/**
 * seo:sync-all
 *
 * Backfills or refreshes the SeoMeta records for all existing entities.
 * Run this once after deploying the observer system, or any time you want
 * to force-regenerate all auto-managed SEO entries.
 *
 * Usage:
 *   php artisan seo:sync-all                 (all entity types)
 *   php artisan seo:sync-all --type=products (single type)
 *   php artisan seo:sync-all --force         (overwrite manual edits too)
 */
class SeoSyncAllCommand extends Command
{
    protected $signature = 'seo:sync-all
                            {--type= : Restrict to a single type: products, categories, showrooms, blog}
                            {--force : Overwrite manually edited meta fields as well}';

    protected $description = 'Backfill / refresh JSON-LD structured data and meta for all entities';

    public function __construct(protected SeoJsonLdGenerator $generator)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $type  = $this->option('type');
        $force = (bool) $this->option('force');

        $this->info("🔄  SEO sync started" . ($type ? " (type: {$type})" : '') . ($force ? ' [FORCE]' : ''));

        if (!$type || $type === 'products') {
            $this->syncProducts($force);
        }
        if (!$type || $type === 'categories') {
            $this->syncCategories($force);
        }
        if (!$type || $type === 'showrooms') {
            $this->syncShowrooms($force);
        }
        if (!$type || $type === 'blog') {
            $this->syncBlog($force);
        }

        $this->newLine();
        $this->info('✅  SEO sync completed.');

        return Command::SUCCESS;
    }

    // ──────────────────────────────────────────────────────────────────────

    protected function syncProducts(bool $force): void
    {
        $query    = Product::with('sizes');
        $total    = $query->count();
        $this->line("  → Products ({$total})");
        $bar      = $this->output->createProgressBar($total);
        $bar->start();

        $query->chunk(50, function ($products) use ($bar, $force) {
            foreach ($products as $product) {
                try {
                    $slug = $product->slug ?: $product->id;
                    $this->generator->sync($product, 'Product', "product_{$slug}", "Produit : {$product->name}", $force);
                } catch (\Throwable $e) {
                    $this->warn("    ⚠ Product {$product->id}: {$e->getMessage()}");
                }
                $bar->advance();
            }
        });

        $bar->finish();
        $this->newLine();
    }

    protected function syncCategories(bool $force): void
    {
        $total = Categorie::count();
        $this->line("  → Categories ({$total})");
        $bar   = $this->output->createProgressBar($total);
        $bar->start();

        Categorie::chunk(50, function ($cats) use ($bar, $force) {
            foreach ($cats as $cat) {
                try {
                    $slug   = \Illuminate\Support\Str::slug($cat->label ?? (string) $cat->id);
                    $pageId = "categorie_{$slug}";
                    $this->generator->sync($cat, 'CollectionPage', $pageId, "Catégorie : {$cat->label}", $force);
                } catch (\Throwable $e) {
                    $this->warn("    ⚠ Categorie {$cat->id}: {$e->getMessage()}");
                }
                $bar->advance();
            }
        });

        $bar->finish();
        $this->newLine();
    }

    protected function syncShowrooms(bool $force): void
    {
        $total = Showroom::count();
        $this->line("  → Showrooms ({$total})");
        $bar   = $this->output->createProgressBar($total);
        $bar->start();

        Showroom::chunk(50, function ($showrooms) use ($bar, $force) {
            foreach ($showrooms as $sr) {
                try {
                    $slug   = \Illuminate\Support\Str::slug($sr->name ?? (string) $sr->id);
                    $pageId = "showroom_{$slug}";
                    $this->generator->sync($sr, 'LocalBusiness', $pageId, "Showroom : {$sr->name}", $force);
                } catch (\Throwable $e) {
                    $this->warn("    ⚠ Showroom {$sr->id}: {$e->getMessage()}");
                }
                $bar->advance();
            }
        });

        $bar->finish();
        $this->newLine();
    }

    protected function syncBlog(bool $force): void
    {
        $total = BlogPost::published()->count();
        $this->line("  → Blog posts published ({$total})");
        $bar   = $this->output->createProgressBar($total);
        $bar->start();

        BlogPost::published()->chunk(50, function ($posts) use ($bar, $force) {
            foreach ($posts as $post) {
                try {
                    $pageId = "blog_{$post->slug}";
                    $this->generator->sync($post, 'Article', $pageId, "Blog : {$post->title}", $force);
                } catch (\Throwable $e) {
                    $this->warn("    ⚠ BlogPost {$post->id}: {$e->getMessage()}");
                }
                $bar->advance();
            }
        });

        $bar->finish();
        $this->newLine();
    }
}
