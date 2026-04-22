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
        Schema::table('orders', function (Blueprint $table) {
            $table->string('phone2')->nullable()->after('phone');
        });

        Schema::table('delivery_notes', function (Blueprint $table) {
            $table->string('phone2')->nullable()->after('phone');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn('phone2');
        });

        Schema::table('delivery_notes', function (Blueprint $table) {
            $table->dropColumn('phone2');
        });
    }
};
