<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Ajouter une valeur par défaut aux colonnes subtotal et total
        DB::statement('ALTER TABLE `orders` MODIFY `subtotal` DECIMAL(10,2) DEFAULT 0 NOT NULL');
        DB::statement('ALTER TABLE `orders` MODIFY `total` DECIMAL(10,2) DEFAULT 0 NOT NULL');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            //
        });
    }
};
