<?php

namespace App\Observers;

use App\Models\BlogPost;
use App\Services\SeoJsonLdGenerator;

/**
 * BlogPostObserver
 *
 * Fires on every CRUD event for App\Models\BlogPost and keeps the associated
 * SeoMeta record (JSON-LD + meta fields) perfectly in sync.
 *
 * Schema.org type used: Article
 * page_identifier pattern: "blog_{slug}"
 * Only published posts get a SeoMeta record; unpublished ones are skipped
 * (the record is deleted if the post is unpublished after being published).
 */
class BlogPostObserver
{
    public function __construct(protected SeoJsonLdGenerator $generator) {}

    public function created(BlogPost $post): void
    {
        if ($post->published) {
            $this->sync($post);
        }
    }

    public function updated(BlogPost $post): void
    {
        if ($post->published) {
            $this->sync($post);
        } else {
            // Was published before, now unpublished → remove SEO entry
            $this->generator->delete($this->pageId($post));
        }
    }

    public function deleted(BlogPost $post): void
    {
        $this->generator->delete($this->pageId($post));
    }

    protected function sync(BlogPost $post): void
    {
        $this->generator->sync(
            entity:    $post,
            schemaType: 'Article',
            pageId:    $this->pageId($post),
            pageLabel: "Blog : {$post->title}",
        );
    }

    protected function pageId(BlogPost $post): string
    {
        return 'blog_' . ($post->slug ?: $post->id);
    }
}
