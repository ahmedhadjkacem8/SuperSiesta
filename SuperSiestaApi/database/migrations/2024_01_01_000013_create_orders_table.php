<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(\DB::raw('(UUID())'));
            $table->foreignId('user_id')->nullable();
            $table->uuid('quote_id')->nullable();
            $table->uuid('invoice_id')->nullable();
            $table->string('order_number')->unique();
            $table->enum('status', ['en_attente', 'confirmée', 'expédiée', 'livrée', 'annulée'])->default('en_attente');
            $table->string('full_name');
            $table->string('phone');
            $table->string('address');
            $table->string('city');
            $table->text('notes')->nullable();
            $table->decimal('subtotal', 10, 2)->default(0);
            $table->decimal('total', 10, 2)->default(0);
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users')->onDelete('set null');
            $table->foreign('quote_id')->references('id')->on('quotes')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
