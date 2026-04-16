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
        Schema::table('quotes', function (Blueprint $table) {
            $table->string('client_name')->nullable()->after('client_id');
            $table->string('discount_type')->default('amount')->after('total'); // 'percentage' or 'amount'
            $table->decimal('discount_value', 15, 3)->default(0)->after('discount_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('quotes', function (Blueprint $table) {
            $table->dropColumn(['client_name', 'discount_type', 'discount_value']);
        });
    }
};
