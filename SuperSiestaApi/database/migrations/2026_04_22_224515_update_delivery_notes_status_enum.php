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
        // Temporarily disable strict mode to handle invalid existing data
        DB::statement("SET SESSION sql_mode = ''");

        // Normalize existing rows: map any invalid statuses to 'preparation'
        DB::statement("UPDATE `delivery_notes` SET `status` = 'preparation' WHERE `status` NOT IN ('preparation', 'en_livraison', 'livrée', 'annulée', 'retour')");
        // Also catch empty strings which result from previous truncation
        DB::statement("UPDATE `delivery_notes` SET `status` = 'preparation' WHERE `status` = ''");

        // Ensure the ENUM is correctly defined
        DB::statement("ALTER TABLE `delivery_notes` MODIFY `status` ENUM('preparation', 'en_livraison', 'livrée', 'annulée', 'retour') NOT NULL DEFAULT 'preparation'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Keep as is
    }
};
