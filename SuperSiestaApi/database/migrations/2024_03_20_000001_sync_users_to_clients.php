<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use App\Models\User;
use App\Models\Client;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Add user_id to clients table for better linkage
        if (!Schema::hasColumn('clients', 'user_id')) {
            Schema::table('clients', function (Blueprint $table) {
                $table->foreignId('user_id')->nullable()->after('id')->constrained('users')->onDelete('set null');
            });
        }

        // 2. Sync existing users to clients table
        $users = User::with('profile')->get();
        foreach ($users as $user) {
            // Skip admins if they shouldn't be in CRM
            if ($user->roles()->where('role', 'admin')->exists()) {
                continue;
            }

            $exists = Client::where('email', $user->email)->orWhere('user_id', $user->id)->exists();
            
            if (!$exists) {
                Client::create([
                    'user_id' => $user->id,
                    'full_name' => $user->profile->full_name ?? $user->name ?? 'Utilisateur ' . $user->id,
                    'email' => $user->email,
                    'phone' => $user->profile->phone ?? null,
                    'address' => $user->profile->address ?? null,
                    'city' => $user->profile->city ?? null,
                    'tags' => ['Particulier'], // Default tag
                ]);
            } else {
                // Update user_id if matched by email
                Client::where('email', $user->email)->whereNull('user_id')->update(['user_id' => $user->id]);
            }
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('clients', 'user_id')) {
            Schema::table('clients', function (Blueprint $table) {
                $table->dropForeign(['user_id']);
                $table->dropColumn('user_id');
            });
        }
    }
};
