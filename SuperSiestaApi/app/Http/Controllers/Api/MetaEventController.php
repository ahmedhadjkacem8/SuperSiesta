<?php

namespace App\Http\Controllers\Api;

use App\Jobs\SendMetaCapiEventJob;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * MetaEventController
 *
 * Public endpoint to receive browser-side Meta Pixel events and relay them
 * to Meta Graph API via the Conversions API (CAPI) for server-side redundancy.
 *
 * The browser sends both:
 *   - window.fbq('track', EventName, payload, { eventID: eid })  → Meta Pixel
 *   - POST /api/meta/event { event_name, event_id, ... }         → This controller → CAPI
 *
 * Both share the same event_id, allowing Meta to deduplicate and count only once.
 */
class MetaEventController extends BaseController
{
    /**
     * Relay a browser-side event to Meta CAPI (server-side mirror).
     *
     * Accepted events: PageView, ViewContent, AddToCart, InitiateCheckout, Lead, Search, Subscribe
     * Purchase is handled separately via OrderController with full user PII.
     *
     * POST /api/meta/event
     * Body: {
     *   event_name:       string  (required)
     *   event_id:         string  (required — UUIDv4 generated client-side)
     *   event_source_url: string  (optional — current page URL)
     *   fbp:              string  (optional — _fbp cookie)
     *   fbc:              string  (optional — _fbc cookie)
     *   custom_data:      object  (optional — value, content_ids, currency, etc.)
     *   user_data:        object  (optional — email, phone, full_name, etc.)
     * }
     */
    public function relay(Request $request): JsonResponse
    {
        $request->validate([
            'event_name'       => 'required|string|max:100',
            'event_id'         => 'required|string|max:200',
            'event_source_url' => 'nullable|string|max:1000',
            'fbp'              => 'nullable|string|max:200',
            'fbc'              => 'nullable|string|max:200',
            'custom_data'      => 'nullable|array',
            'user_data'        => 'nullable|array',
        ]);

        // Block Purchase events — handled by OrderController with full checkout PII for deduplication integrity
        if (strtolower($request->input('event_name')) === 'purchase') {
            return $this->sendError('Purchase events must be sent via /api/orders endpoint.', [], 422);
        }

        // Capture HTTP request context before dispatching to queue
        $clientIp = $request->header('CF-Connecting-IP')
            ?: ($request->header('X-Forwarded-For') ? trim(explode(',', $request->header('X-Forwarded-For'))[0]) : null)
            ?: $request->ip();

        $eventSourceUrl = $request->input('event_source_url')
            ?: $request->headers->get('referer')
            ?: config('app.url', 'http://localhost');

        $inputUserData = $request->input('user_data', []);

        // Base user data: browser identifiers + IP/User-Agent
        $userData = [
            'fbp'               => $request->input('fbp') ?: ($inputUserData['fbp'] ?? null),
            'fbc'               => $request->input('fbc') ?: ($inputUserData['fbc'] ?? null),
            'client_ip_address' => $clientIp,
            'client_user_agent' => $request->userAgent(),
        ];

        // Merge any available user PII (email, phone, name, city) for high Event Match Quality (EMQ)
        if (is_array($inputUserData)) {
            if (!empty($inputUserData['email'])) {
                $userData['email'] = $inputUserData['email'];
            }
            if (!empty($inputUserData['phone'])) {
                $userData['phone'] = $inputUserData['phone'];
            }
            if (!empty($inputUserData['full_name'])) {
                $userData['full_name'] = $inputUserData['full_name'];
            } elseif (!empty($inputUserData['name'])) {
                $userData['full_name'] = $inputUserData['name'];
            }
            if (!empty($inputUserData['city'])) {
                $userData['city'] = $inputUserData['city'];
            }
            if (!empty($inputUserData['country'])) {
                $userData['country'] = $inputUserData['country'];
            }
        }

        $customData = $request->input('custom_data', []);

        // Dispatch asynchronously — never block the browser's response
        SendMetaCapiEventJob::dispatch(
            $request->input('event_name'),
            $userData,
            $customData,
            $request->input('event_id'),
            $eventSourceUrl,
        );

        return $this->sendResponse([
            'event_id'   => $request->input('event_id'),
            'event_name' => $request->input('event_name'),
            'queued'     => true,
        ], 'Meta CAPI event queued successfully.');
    }
}
