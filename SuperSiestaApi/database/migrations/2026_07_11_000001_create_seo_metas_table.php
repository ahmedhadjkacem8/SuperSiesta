<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('seo_metas', function (Blueprint $table) {
            $table->id();

            // Page identification
            $table->string('page_identifier', 100)->unique();
            $table->string('page_label', 255)->nullable(); // Friendly label for admin

            // Polymorphic relation (nullable for static pages)
            $table->string('seoable_type')->nullable();
            $table->unsignedBigInteger('seoable_id')->nullable();
            $table->index(['seoable_type', 'seoable_id']);

            // === Core Meta Tags ===
            $table->string('meta_title', 70)->nullable();
            $table->string('meta_description', 160)->nullable();
            $table->text('meta_keywords')->nullable(); // comma-separated
            $table->string('meta_robots', 100)->default('index,follow');

            // === Open Graph (Facebook / LinkedIn) ===
            $table->string('og_title', 95)->nullable();
            $table->string('og_description', 200)->nullable();
            $table->text('og_image')->nullable();
            $table->string('og_type', 50)->default('website');
            $table->string('og_locale', 10)->default('fr_FR');

            // === Twitter Cards ===
            $table->string('twitter_card', 20)->default('summary_large_image');
            $table->string('twitter_title', 70)->nullable();
            $table->string('twitter_description', 200)->nullable();
            $table->text('twitter_image')->nullable();

            // === Structured Data (JSON-LD) ===
            $table->string('json_ld_type', 50)->nullable();
            $table->json('json_ld_data')->nullable();

            // === Sitemap Control ===
            $table->decimal('priority', 2, 1)->default(0.5);
            $table->string('changefreq', 20)->default('weekly');

            // === SEO Scoring & Control ===
            $table->integer('seo_score')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamp('last_analyzed_at')->nullable();
            $table->text('notes')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('seo_metas');
    }
};
