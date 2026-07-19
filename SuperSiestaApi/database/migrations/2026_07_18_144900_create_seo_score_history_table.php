<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('seo_score_history', function (Blueprint $table) {
            $table->id();
            $table->foreignId('seo_meta_id')->constrained('seo_metas')->onDelete('cascade');
            $table->integer('score');
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::table('seo_metas', function (Blueprint $table) {
            $table->json('recommendations')->nullable()->after('seo_score');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('seo_metas', function (Blueprint $table) {
            $table->dropColumn('recommendations');
        });

        Schema::dropIfExists('seo_score_history');
    }
};
