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
            $table->decimal('total', 10, 3)->change();
        });

        Schema::table('invoices', function (Blueprint $table) {
            $table->decimal('total', 10, 3)->change();
        });

        Schema::table('invoice_items', function (Blueprint $table) {
            $table->decimal('unit_price', 10, 3)->change();
            $table->decimal('total', 10, 3)->change();
        });

        Schema::table('treasury_entries', function (Blueprint $table) {
            $table->decimal('amount', 10, 3)->change();
        });

        Schema::table('product_sizes', function (Blueprint $table) {
            $table->decimal('price', 10, 3)->change();
            $table->decimal('reseller_price', 10, 3)->nullable()->change();
            $table->decimal('original_price', 10, 3)->nullable()->change();
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->decimal('subtotal', 10, 3)->change();
            $table->decimal('total', 10, 3)->change();
        });

        Schema::table('order_items', function (Blueprint $table) {
            $table->decimal('unit_price', 10, 3)->change();
            $table->decimal('total', 10, 3)->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Reverting to default decimal(8, 2) or whatever it was
        Schema::table('quotes', function (Blueprint $table) {
            $table->decimal('total', 10, 2)->change();
        });

        Schema::table('invoices', function (Blueprint $table) {
            $table->decimal('total', 10, 2)->change();
        });

        Schema::table('invoice_items', function (Blueprint $table) {
            $table->decimal('unit_price', 10, 2)->change();
            $table->decimal('total', 10, 2)->change();
        });

        Schema::table('treasury_entries', function (Blueprint $table) {
            $table->decimal('amount', 10, 2)->change();
        });

        Schema::table('product_sizes', function (Blueprint $table) {
            $table->decimal('price', 10, 2)->change();
            $table->decimal('reseller_price', 10, 2)->nullable()->change();
            $table->decimal('original_price', 10, 2)->nullable()->change();
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->decimal('subtotal', 10, 2)->change();
            $table->decimal('total', 10, 2)->change();
        });

        Schema::table('order_items', function (Blueprint $table) {
            $table->decimal('unit_price', 10, 2)->change();
            $table->decimal('total', 10, 2)->change();
        });
    }
};
