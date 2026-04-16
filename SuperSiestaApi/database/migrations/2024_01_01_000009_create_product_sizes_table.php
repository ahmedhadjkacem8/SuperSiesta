<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_sizes', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(\DB::raw('(UUID())'));
            $table->uuid('product_id');
            $table->string('label');
            $table->decimal('price', 10, 2)->default(0);
            $table->decimal('reseller_price', 10, 2)->nullable();
            $table->decimal('original_price', 10, 2)->nullable();
            $table->timestamps();

            $table->foreign('product_id')->references('id')->on('products')->onDelete('cascade');
            $table->unique(['product_id', 'label']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_sizes');
    }
};
