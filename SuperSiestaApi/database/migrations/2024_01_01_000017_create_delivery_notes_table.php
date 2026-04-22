<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('delivery_notes', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(\DB::raw('(UUID())'));
            $table->string('delivery_number')->unique();
            $table->uuid('order_id')->nullable();
            $table->uuid('client_id')->nullable();
            $table->enum('status', ['preparation', 'en_livraison', 'livrée', 'annulée', 'retour'])->default('preparation');
            $table->string('delivery_address')->nullable();
            $table->string('delivery_city')->nullable();
            $table->string('full_name');
            $table->string('phone')->nullable();
            $table->text('notes')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamps();

            $table->foreign('order_id')->references('id')->on('orders')->onDelete('set null');
            $table->foreign('client_id')->references('id')->on('clients')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('delivery_notes');
    }
};
