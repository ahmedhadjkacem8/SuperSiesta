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
        Schema::table('delivery_notes', function (Blueprint $table) {
            $table->uuid('delivery_man_id')->nullable();
            $table->string('delivery_man_name')->nullable();
            
            $table->foreign('delivery_man_id')->references('id')->on('delivery_men')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('delivery_notes', function (Blueprint $table) {
            $table->dropForeign(['delivery_man_id']);
            $table->dropColumn(['delivery_man_id', 'delivery_man_name']);
        });
    }
};
