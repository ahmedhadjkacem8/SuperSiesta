<?php

namespace App\Http\Controllers\Api;

use App\Models\PushToken;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PushTokenController extends BaseController
{
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        abort_unless($user && $user->isAdmin(), 403, 'Admin access required.');

        $validated = $request->validate([
            'token' => ['required', 'string', 'max:2048'],
            'platform' => ['required', 'in:android,ios'],
            'device_id' => ['nullable', 'string', 'max:255'],
        ]);

        $pushToken = PushToken::updateOrCreate(
            [
                'user_id' => $user->id,
                'token_hash' => hash('sha256', $validated['token']),
            ],
            [
                'token' => $validated['token'],
                'platform' => $validated['platform'],
                'device_id' => $validated['device_id'] ?? null,
                'last_seen_at' => now(),
                'revoked_at' => null,
            ]
        );

        return $this->sendResponse($pushToken, 'Push token registered.');
    }

    public function destroy(Request $request, PushToken $pushToken): JsonResponse
    {
        abort_unless($request->user()?->isAdmin() && $pushToken->user_id === $request->user()->id, 403);

        $pushToken->update(['revoked_at' => now()]);

        return $this->sendResponse(null, 'Push token revoked.');
    }
}
