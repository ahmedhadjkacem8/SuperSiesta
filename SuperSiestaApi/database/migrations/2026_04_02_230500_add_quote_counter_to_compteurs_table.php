<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // On s'assure que le compteur 'devis' existe
        $exists = DB::table('compteurs')->where('type', 'devis')->exists();
        
        if (!$exists) {
            DB::table('compteurs')->insert([
                'type' => 'devis',
                'prefix' => 'QT-',
                'suffix' => '',
                'numero' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // On ne supprime pas forcément car d'autres données peuvent s'y être greffées
    }
};
