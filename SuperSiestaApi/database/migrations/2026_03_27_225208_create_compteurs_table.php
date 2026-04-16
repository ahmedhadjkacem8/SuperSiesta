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
        Schema::create('compteurs', function (Blueprint $table) {
            $table->id();
            $table->string('type')->unique(); // 'commande', 'facture', 'bon_livraison', 'client'
            $table->string('prefix')->nullable();
            $table->string('suffix')->nullable();
            $table->bigInteger('numero')->default(1);
            $table->timestamps();
        });

        // Initialiser avec les compteurs par défaut
        DB::table('compteurs')->insert([
            ['type' => 'commande', 'prefix' => 'CMD-', 'suffix' => '', 'numero' => 1, 'created_at' => now(), 'updated_at' => now()],
            ['type' => 'facture', 'prefix' => 'INV-', 'suffix' => '', 'numero' => 1, 'created_at' => now(), 'updated_at' => now()],
            ['type' => 'bon_livraison', 'prefix' => 'BL-', 'suffix' => '', 'numero' => 1, 'created_at' => now(), 'updated_at' => now()],
            ['type' => 'client', 'prefix' => 'CLI-', 'suffix' => '', 'numero' => 1, 'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('compteurs');
    }
};
