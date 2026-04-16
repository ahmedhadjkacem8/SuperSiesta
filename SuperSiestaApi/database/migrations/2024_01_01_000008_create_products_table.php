<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(\DB::raw('(UUID())'));
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('categorie')->default('orthopédique');
            $table->string('fermete')->default('ferme');
            $table->string('gamme')->nullable();
            $table->string('image')->default('');
            $table->json('images')->nullable();
            $table->text('description')->nullable();
            $table->json('specs')->nullable();
            $table->string('badge')->nullable();
            $table->boolean('in_promo')->default(false);
            $table->timestamps();

            $table->index('slug');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
