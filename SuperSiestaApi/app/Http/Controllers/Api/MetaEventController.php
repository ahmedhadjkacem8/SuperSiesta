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
     *   custom_data:      object  (optional — value, content_ids, etc.)
     * }
     */
    public function relay(Request $request): JsonResponse
    {
        $request->validate([
            'event_name'       => 'required|string|max:100',
            'event_id'         => 'required|string|max:200',
            'event_source_url' => 'nullable|url|max:500',
            'fbp'              => 'nullable|string|max:200',
            'fbc'              => 'nullable|string|max:200',
            'custom_data'      => 'nullable|array',
        ]);

        // Block Purchase events — handled by OrderController with full PII for deduplication integrity
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

        // User data: no PII collected for these public events — only browser context identifiers
        $userData = [
            'fbp'               => $request->input('fbp'),
            'fbc'               => $request->input('fbc'),
            'client_ip_address' => $clientIp,
            'client_user_agent' => $request->userAgent(),
        ];

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
