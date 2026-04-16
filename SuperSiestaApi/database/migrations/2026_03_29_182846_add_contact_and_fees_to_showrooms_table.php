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
        Schema::table('showrooms', function (Blueprint $table) {
            $table->string('contact_person_name')->nullable()->after('name');
            $table->string('contact_person_phone')->nullable()->after('contact_person_name');
            $table->string('contact_person_email')->nullable()->after('contact_person_phone');
            $table->date('fees_start_date')->nullable()->after('contact_person_email');
            $table->date('fees_end_date')->nullable()->after('fees_start_date');
            $table->json('operating_days')->nullable()->after('fees_end_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('showrooms', function (Blueprint $table) {
            $table->dropColumn([
                'contact_person_name',
                'contact_person_phone',
                'contact_person_email',
                'fees_start_date',
                'fees_end_date',
                'operating_days'
            ]);
        });
    }
};
