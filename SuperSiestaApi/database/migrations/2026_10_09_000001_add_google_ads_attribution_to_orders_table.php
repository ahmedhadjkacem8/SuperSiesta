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
            $table->string('gclid', 255)->nullable()->after('bl_contact')->index();
            $table->string('gbraid', 255)->nullable()->after('gclid');
            $table->string('wbraid', 255)->nullable()->after('gbraid');
            $table->timestamp('ads_click_captured_at')->nullable()->after('wbraid');
            $table->timestamp('ads_exported_at')->nullable()->after('ads_click_captured_at')->index();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex(['gclid']);
            $table->dropIndex(['ads_exported_at']);
            $table->dropColumn([
                'gclid',
                'gbraid',
                'wbraid',
                'ads_click_captured_at',
                'ads_exported_at',
            ]);
        });
    }
};
