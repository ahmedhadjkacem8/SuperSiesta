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
        Schema::table('products', function (Blueprint $table) {
            $table->string('grammage')->nullable();
        });

        Schema::table('order_items', function (Blueprint $table) {
            $table->string('grammage')->nullable();
        });

        Schema::table('delivery_note_items', function (Blueprint $table) {
            $table->string('grammage')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('delivery_note_items', function (Blueprint $table) {
            $table->dropColumn('grammage');
        });

        Schema::table('order_items', function (Blueprint $table) {
            $table->dropColumn('grammage');
        });

        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('grammage');
        });
    }
};
