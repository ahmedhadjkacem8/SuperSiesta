<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('meta_fbclid', 255)->nullable()->after('wbraid')->index();
            $table->string('meta_fbc', 512)->nullable()->after('meta_fbclid');
            $table->string('meta_fbp', 255)->nullable()->after('meta_fbc');
            $table->timestamp('meta_click_captured_at')->nullable()->after('meta_fbp');
            $table->string('meta_attribution_session', 64)->nullable()->after('meta_click_captured_at');
            $table->string('meta_event_id', 100)->nullable()->unique()->after('meta_attribution_session');
            $table->string('meta_client_ip', 45)->nullable()->after('meta_event_id');
            $table->text('meta_client_user_agent')->nullable()->after('meta_client_ip');
            $table->string('meta_event_source_url', 1000)->nullable()->after('meta_client_user_agent');
            $table->timestamp('meta_purchase_queued_at')->nullable()->after('meta_event_source_url');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropUnique(['meta_event_id']);
            $table->dropIndex(['meta_fbclid']);
            $table->dropColumn([
                'meta_fbclid',
                'meta_fbc',
                'meta_fbp',
                'meta_click_captured_at',
                'meta_attribution_session',
                'meta_event_id',
                'meta_client_ip',
                'meta_client_user_agent',
                'meta_event_source_url',
                'meta_purchase_queued_at',
            ]);
        });
    }
};
