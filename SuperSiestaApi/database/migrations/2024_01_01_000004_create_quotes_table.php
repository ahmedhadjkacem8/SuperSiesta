<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('quotes', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(\DB::raw('(UUID())'));
            $table->string('quote_number')->unique();
            $table->uuid('client_id')->nullable();
            $table->enum('status', ['brouillon', 'envoyé', 'accepté', 'refusé', 'facturé'])->default('brouillon');
            $table->decimal('total', 10, 3)->default(0);
            $table->text('notes')->nullable();
            $table->date('valid_until')->nullable();
            $table->timestamps();

            $table->foreign('client_id')->references('id')->on('clients')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('quotes');
    }
};
