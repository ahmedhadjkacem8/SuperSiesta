<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('site_content', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(\DB::raw('(UUID())'));
            $table->string('key')->unique();
            $table->string('title')->nullable();
            $table->longText('content')->nullable();
            $table->string('image_url')->nullable();
            $table->string('section')->nullable();
            $table->string('page')->default('home');
            $table->timestamp('updated_at')->default(\DB::raw('CURRENT_TIMESTAMP on update CURRENT_TIMESTAMP'));

            $table->index('key');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('site_content');
    }
};
