<?php

namespace App\Observers;

use App\Models\Showroom;
use App\Services\SeoJsonLdGenerator;

/**
 * ShowroomObserver
 *
 * Fires on every CRUD event for App\Models\Showroom and keeps the associated
 * SeoMeta record (JSON-LD + meta fields) perfectly in sync.
 *
 * Schema.org type used: LocalBusiness
 * page_identifier pattern: "showroom_{slug-of-name}"
 */
class ShowroomObserver
{
    public function __construct(protected SeoJsonLdGenerator $generator) {}

    public function created(Showroom $showroom): void
    {
        $this->sync($showroom);
    }

    public function updated(Showroom $showroom): void
    {
        $this->sync($showroom);
    }

    public function deleted(Showroom $showroom): void
    {
        $this->generator->delete($this->pageId($showroom));
    }

    protected function sync(Showroom $showroom): void
    {
        $this->generator->sync(
            entity:    $showroom,
            schemaType: 'LocalBusiness',
            pageId:    $this->pageId($showroom),
            pageLabel: "Showroom : {$showroom->name}",
        );
    }

    protected function pageId(Showroom $showroom): string
    {
        $slug = \Illuminate\Support\Str::slug($showroom->name ?? (string) $showroom->id);
        return "showroom_{$slug}";
    }
}
