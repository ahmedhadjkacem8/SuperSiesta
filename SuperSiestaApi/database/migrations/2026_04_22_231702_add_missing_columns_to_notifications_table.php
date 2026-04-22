<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            if (!Schema::hasColumn('notifications', 'color')) {
                $table->string('color')->nullable()->after('type');
            }
            if (!Schema::hasColumn('notifications', 'duration')) {
                $table->integer('duration')->default(5)->after('color');
            }
            if (!Schema::hasColumn('notifications', 'status')) {
                $table->string('status')->default('new')->after('duration');
            }
            if (!Schema::hasColumn('notifications', 'read_at')) {
                $table->timestamp('read_at')->nullable()->after('is_read');
            }
            if (!Schema::hasColumn('notifications', 'expires_at')) {
                $table->timestamp('expires_at')->nullable()->after('read_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            $table->dropColumn(['color', 'duration', 'status', 'read_at', 'expires_at']);
        });
    }
};
