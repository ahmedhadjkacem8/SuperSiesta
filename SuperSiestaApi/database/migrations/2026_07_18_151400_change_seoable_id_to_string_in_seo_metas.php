<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Change seoable_id from unsignedBigInteger to string(36) so it can store
     * UUIDs produced by models that use the HasUuids trait (Product, Categorie,
     * Showroom, BlogPost, …).
     */
    public function up(): void
    {
        Schema::table('seo_metas', function (Blueprint $table) {
            // Drop the old index first (if any) before changing the column type
            $table->string('seoable_id', 36)->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('seo_metas', function (Blueprint $table) {
            $table->unsignedBigInteger('seoable_id')->nullable()->change();
        });
    }
};
