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
        Schema::table('free_gifts', function (Blueprint $table) {
            // Rename quantite to poids
            $table->renameColumn('quantite', 'poids');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('free_gifts', function (Blueprint $table) {
            $table->renameColumn('poids', 'quantite');
        });
    }
};
