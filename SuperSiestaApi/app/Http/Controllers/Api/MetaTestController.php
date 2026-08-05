<?php

namespace App\Http\Controllers\Api;

use App\Services\MetaConversionsApiService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MetaTestController extends BaseController
{
    /**
     * Get Meta CAPI & Pixel configuration status (Masked for security)
     */
    public function getConfig(): JsonResponse
    {
        $pixelId = (string) config('services.meta.pixel_id', '1012351344935449');
        $accessToken = config('services.meta.access_token');
        $testEventCode = config('services.meta.test_event_code');

        $maskedToken = null;
        if (!empty($accessToken)) {
            $len = strlen($accessToken);
            if ($len > 12) {
                $maskedToken = substr($accessToken, 0, 6) . '...' . substr($accessToken, -6) . " (Length: {$len})";
            } else {
                $maskedToken = 'Configured (Short)';
            }
        }

        return $this->sendResponse([
            'pixel_id' => $pixelId,
            'has_access_token' => !empty($accessToken),
            'masked_access_token' => $maskedToken,
            'test_event_code' => $testEventCode,
            'app_env' => config('app.env'),
            'app_url' => config('app.url'),
        ], 'Meta Configuration Status');
    }

    /**
     * Test sending a CAPI event to Meta Graph API synchronously
     */
    public function testCapi(Request $request, MetaConversionsApiService $service): JsonResponse
    {
        $request->validate([
            'event_name' => 'required|string',
            'user_data' => 'nullable|array',
            'custom_data' => 'nullable|array',
            'event_id' => 'nullable|string',
            'event_source_url' => 'nullable|string',
        ]);

        $eventName = $request->input('event_name', 'PageView');
        $userData = $request->input('user_data', []);
        $customData = $request->input('custom_data', []);
        $eventId = $request->input('event_id') ?: ('test-' . time() . '-' . rand(1000, 9999));
        $eventSourceUrl = $request->input('event_source_url', config('app.url'));

        // Default test user data if none supplied
        if (empty($userData)) {
            $userData = [
                'email' => 'test_user@supersiesta.tn',
                'phone' => '21620123456',
                'full_name' => 'Test Meta User',
                'city' => 'Tunis',
                'country' => 'tn',
            ];
        }

        if (empty($customData)) {
            $customData = [
                'value' => 150.00,
                'currency' => 'TND',
                'content_name' => 'Matelas Test Meta',
            ];
        }

        // Send event synchronously
        $result = $service->sendEvent(
            $eventName,
            $userData,
            $customData,
            $eventId,
            $eventSourceUrl
        );

        return response()->json([
            'success' => $result['status'] === 'success',
            'timestamp' => now()->toIso8601String(),
            'event_id' => $eventId,
            'event_name' => $eventName,
            'sent_user_data_sample' => $service->buildUserData($userData),
            'sent_custom_data' => $customData,
            'result' => $result,
        ]);
    }
}
