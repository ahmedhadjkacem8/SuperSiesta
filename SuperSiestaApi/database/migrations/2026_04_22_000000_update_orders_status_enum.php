<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Temporarily disable strict mode so MySQL treats ENUM truncation as a warning
        \DB::statement("SET SESSION sql_mode = ''");

        // Map all known legacy statuses to valid ones
        \DB::statement("UPDATE `orders` SET `status` = 'accepté' WHERE `status` IN ('confirmée', 'expédiée', 'livrée')");
        \DB::statement("UPDATE `orders` SET `status` = 'en_attente' WHERE `status` NOT IN ('en_attente', 'accepté', 'annulée')");

        // Alter the column — with strict mode off this succeeds even if any stray values remain
        \DB::statement("ALTER TABLE `orders` MODIFY `status` ENUM('en_attente','accepté','annulée') NOT NULL DEFAULT 'en_attente'");
    }

    public function down(): void
    {
        // Revert to previous possible values - include old ones to be safe
        \DB::statement("ALTER TABLE `orders` MODIFY `status` ENUM('en_attente','confirmée','expédiée','livrée','annulée') NOT NULL DEFAULT 'en_attente'");
    }
};
