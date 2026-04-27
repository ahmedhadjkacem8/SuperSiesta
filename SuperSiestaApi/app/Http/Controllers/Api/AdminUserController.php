<?php

namespace App\Http\Controllers\Api;

use App\Models\User;
use App\Models\UserRole;
use App\Models\Profile;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AdminUserController extends BaseController
{
    /**
     * Get all admin users
     */
    public function index(Request $request): JsonResponse
    {
        // Security: only admins can list admins
        if (!$request->user()->isAdmin()) {
            return $this->sendError('Unauthorized', 'Only administrators can perform this action', 403);
        }

        $admins = User::whereHas('roles', function ($query) {
            $query->where('role', 'admin');
        })->with('profile')->get();

        // Map names for the frontend which expects full_name
        $admins->each(function($user) {
            $user->full_name = $user->name;
        });

        return $this->sendResponse($admins, 'Admins retrieved successfully');
    }

    /**
     * Create a new admin user
     */
    public function store(Request $request): JsonResponse
    {
        // Security: only admins can create admins
        if (!$request->user()->isAdmin()) {
            return $this->sendError('Unauthorized', 'Only administrators can perform this action', 403);
        }

        $validated = $request->validate([
            'full_name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:6',
        ]);

        try {
            return DB::transaction(function () use ($validated) {
                $user = User::create([
                    'name' => $validated['full_name'],
                    'email' => strtolower($validated['email']),
                    'password' => Hash::make($validated['password']),
                ]);

                // Create profile
                Profile::create([
                    'user_id' => $user->id,
                    'full_name' => $validated['full_name'],
                    'email' => strtolower($validated['email']),
                    'account_type' => 'btoc',
                ]);

                // Assign admin role
                UserRole::create([
                    'user_id' => $user->id,
                    'role' => 'admin',
                ]);

                $user->full_name = $user->name;
                
                Log::info('New admin created', [
                    'created_by' => auth()->id(),
                    'new_admin_id' => $user->id,
                    'email' => $user->email
                ]);

                return $this->sendResponse($user, 'Admin created successfully', 201);
            });
        } catch (\Exception $e) {
            Log::error('Admin creation error: ' . $e->getMessage());
            return $this->sendError('Error', 'An error occurred during admin creation', 500);
        }
    }

    /**
     * Update an admin user
     */
    public function update(Request $request, $id): JsonResponse
    {
        // Security: only admins can update admins
        if (!$request->user()->isAdmin()) {
            return $this->sendError('Unauthorized', 'Only administrators can perform this action', 403);
        }

        $user = User::findOrFail($id);

        if (!$user->isAdmin()) {
            return $this->sendError('Forbidden', 'Target user is not an admin', 403);
        }

        $validated = $request->validate([
            'full_name' => 'string|max:255',
            'email' => 'string|email|max:255|unique:users,email,' . $user->id,
            'password' => 'nullable|string|min:6',
        ]);

        if ($request->has('full_name')) {
            $user->name = $validated['full_name'];
            if ($user->profile) {
                $user->profile->update(['full_name' => $validated['full_name']]);
            }
        }
        if ($request->has('email')) {
            $user->email = strtolower($validated['email']);
            if ($user->profile) {
                $user->profile->update(['email' => strtolower($validated['email'])]);
            }
        }
        if ($request->has('password') && !empty($validated['password'])) {
            $user->password = Hash::make($validated['password']);
        }

        $user->save();
        $user->full_name = $user->name;

        Log::info('Admin updated', [
            'updated_by' => auth()->id(),
            'admin_id' => $user->id
        ]);

        return $this->sendResponse($user, 'Admin updated successfully');
    }

    /**
     * Delete an admin user
     */
    public function destroy(Request $request, $id): JsonResponse
    {
        // Security: only admins can delete admins
        if (!$request->user()->isAdmin()) {
            return $this->sendError('Unauthorized', 'Only administrators can perform this action', 403);
        }

        $user = User::findOrFail($id);

        if (!$user->isAdmin()) {
            return $this->sendError('Forbidden', 'Target user is not an admin', 403);
        }
        
        // Prevent self-deletion
        if ($user->id === $request->user()->id) {
            return $this->sendError('Validation Error', 'Cannot delete your own account', 400);
        }

        // Check if it's the last admin
        $adminCount = User::whereHas('roles', function ($query) {
            $query->where('role', 'admin');
        })->count();

        if ($adminCount <= 1) {
            return $this->sendError('Validation Error', 'Cannot delete the last administrator', 400);
        }

        $user->delete();

        Log::info('Admin deleted', [
            'deleted_by' => auth()->id(),
            'admin_id' => $id
        ]);

        return $this->sendResponse(null, 'Admin deleted successfully');
    }
}
