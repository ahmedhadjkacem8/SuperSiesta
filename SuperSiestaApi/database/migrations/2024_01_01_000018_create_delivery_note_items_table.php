<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('delivery_note_items', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(\DB::raw('(UUID())'));
            $table->uuid('delivery_note_id');
            $table->string('product_name');
            $table->string('product_image')->nullable();
            $table->string('size_label')->default('');
            $table->integer('quantity')->default(1);
            $table->integer('delivered_quantity')->default(0);

            $table->foreign('delivery_note_id')->references('id')->on('delivery_notes')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('delivery_note_items');
    }
};
