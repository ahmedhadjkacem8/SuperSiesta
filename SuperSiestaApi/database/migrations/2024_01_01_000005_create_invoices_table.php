<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoices', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(\DB::raw('(UUID())'));
            $table->string('invoice_number')->unique();
            $table->uuid('client_id')->nullable();
            $table->uuid('quote_id')->nullable();
            $table->uuid('order_id')->nullable();
            $table->enum('status', ['brouillon', 'envoyée', 'payée', 'annulée'])->default('brouillon');
            $table->decimal('total', 10, 3)->default(0);
            $table->decimal('tax_rate', 5, 2)->default(19.00);
            $table->text('notes')->nullable();
            $table->date('due_date')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();

            $table->foreign('client_id')->references('id')->on('clients')->onDelete('set null');
            $table->foreign('quote_id')->references('id')->on('quotes')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoices');
    }
};
