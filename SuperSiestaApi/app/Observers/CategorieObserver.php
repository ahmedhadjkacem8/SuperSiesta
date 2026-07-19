<?php

namespace App\Observers;

use App\Models\Categorie;
use App\Services\SeoJsonLdGenerator;

/**
 * CategorieObserver
 *
 * Fires on every CRUD event for App\Models\Categorie and keeps the associated
 * SeoMeta record (JSON-LD + meta fields) perfectly in sync.
 *
 * Schema.org type used: CollectionPage
 * page_identifier pattern: "categorie_{slug-of-label}"
 */
class CategorieObserver
{
    public function __construct(protected SeoJsonLdGenerator $generator) {}

    public function created(Categorie $categorie): void
    {
        $this->sync($categorie);
    }

    public function updated(Categorie $categorie): void
    {
        $this->sync($categorie);
    }

    public function deleted(Categorie $categorie): void
    {
        $this->generator->delete($this->pageId($categorie));
    }

    protected function sync(Categorie $categorie): void
    {
        $this->generator->sync(
            entity:    $categorie,
            schemaType: 'CollectionPage',
            pageId:    $this->pageId($categorie),
            pageLabel: "Catégorie : {$categorie->label}",
        );
    }

    protected function pageId(Categorie $categorie): string
    {
        // Build a stable slug from the label
        $slug = \Illuminate\Support\Str::slug($categorie->label ?? (string) $categorie->id);
        return "categorie_{$slug}";
    }
}
