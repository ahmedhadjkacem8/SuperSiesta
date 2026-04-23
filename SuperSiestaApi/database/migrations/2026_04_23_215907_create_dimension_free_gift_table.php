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
        Schema::create('dimension_free_gift', function (Blueprint $table) {
            $table->id();
            $table->uuid('dimension_id');
            $table->unsignedBigInteger('free_gift_id');
            $table->timestamps();
            
            $table->foreign('dimension_id')->references('id')->on('dimensions')->onDelete('cascade');
            $table->foreign('free_gift_id')->references('id')->on('free_gifts')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('dimension_free_gift');
    }
};
