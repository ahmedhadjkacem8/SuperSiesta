<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('treasury_entries', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(\DB::raw('(UUID())'));
            $table->enum('type', ['entrée', 'sortie']);
            $table->string('category');
            $table->decimal('amount', 10, 3);
            $table->text('description')->nullable();
            $table->string('reference')->nullable();
            $table->date('entry_date')->default(\DB::raw('CURDATE()'));
            $table->timestamp('created_at')->default(\DB::raw('CURRENT_TIMESTAMP'));
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('treasury_entries');
    }
};
