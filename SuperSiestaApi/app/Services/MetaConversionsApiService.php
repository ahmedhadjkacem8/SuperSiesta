<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Meta Conversions API (CAPI) Service
 * 
 * Handles Server-Side event tracking for Meta Graph API v18.0.
 * Ensures PII normalization + SHA-256 hashing, client proxy IP extraction,
 * event_id deduplication, and strict TND currency compliance.
 */
class MetaConversionsApiService
{
    protected string $pixelId;
    protected ?string $accessToken;
    protected ?string $testEventCode;
    protected string $currency = 'TND';

    public function __construct()
    {
        $this->pixelId = (string) config('services.meta.pixel_id', '4619085544994909');
        $this->accessToken = config('services.meta.access_token');
        $this->testEventCode = config('services.meta.test_event_code');
    }

    /**
     * Send a general event to Meta Conversions API
     */
    public function sendEvent(
        string $eventName,
        array $userData = [],
        array $customData = [],
        ?string $eventId = null,
        ?string $eventSourceUrl = null,
        bool $throwOnRetryableError = false
    ): array {
        if (empty($this->accessToken)) {
            Log::info("Meta CAPI: Access token not configured. Skipping event [{$eventName}].");
            return ['status' => 'skipped', 'reason' => 'missing_access_token'];
        }

        $endpoint = "https://graph.facebook.com/v18.0/{$this->pixelId}/events";

        $normalizedUserData = $this->buildUserData($userData);
        
        // Strict TND Currency Enforcement: Cannot be overridden by $customData
        $normalizedCustomData = array_merge($customData, ['currency' => $this->currency]);

        // Safely resolve event_source_url (CLI / Queue worker proof)
        $sourceUrl = $eventSourceUrl 
            ?? ($userData['event_source_url'] ?? null)
            ?? (!app()->runningInConsole() && request()->hasHeader('referer') ? request()->header('referer') : null)
            ?? config('app.url', 'http://localhost');

        $eventPayload = [
            'event_name' => $eventName,
            'event_time' => time(),
            'action_source' => 'website',
            'event_source_url' => $sourceUrl,
            'user_data' => $normalizedUserData,
            'custom_data' => $normalizedCustomData,
        ];

        if (!empty($eventId)) {
            $eventPayload['event_id'] = $eventId;
        }

        $requestBody = [
            'data' => [$eventPayload],
        ];

        if (!empty($this->testEventCode)) {
            $requestBody['test_event_code'] = $this->testEventCode;
        }

        try {
            $response = Http::timeout(5)
                ->withToken($this->accessToken)
                ->post($endpoint, $requestBody);

            if ($response->successful()) {
                Log::info("Meta CAPI: Event [{$eventName}] sent successfully.", [
                    'event_id' => $eventId,
                    'response' => $response->json(),
                ]);
                return ['status' => 'success', 'data' => $response->json()];
            }

            $status = $response->status();
            $errorBody = $response->body();

            Log::warning("Meta CAPI: Failed to send event [{$eventName}].", [
                'event_id' => $eventId,
                'status_code' => $status,
                'error' => $errorBody,
            ]);

            // Retryable HTTP status codes: 5xx Server Errors or 429 Rate Limit
            if ($throwOnRetryableError && ($status >= 500 || $status === 429)) {
                throw new \RuntimeException("Meta CAPI Server Error [{$status}]: {$errorBody}");
            }

            return ['status' => 'error', 'code' => $status, 'message' => $errorBody];
        } catch (\RuntimeException $e) {
            // Re-throw retryable errors we deliberately created above
            if ($throwOnRetryableError) {
                throw $e;
            }
            Log::error("Meta CAPI Exception: Failed to send event [{$eventName}]. Error: " . $e->getMessage(), [
                'event_id' => $eventId,
            ]);
            return ['status' => 'exception', 'message' => $e->getMessage()];
        } catch (\Throwable $e) {
            Log::error("Meta CAPI Exception: Failed to send event [{$eventName}]. Error: " . $e->getMessage(), [
                'event_id' => $eventId,
                'exception' => $e,
            ]);

            // Network timeouts, connection errors => retryable
            if ($throwOnRetryableError) {
                throw new \RuntimeException("Meta CAPI Network/Connection Error: " . $e->getMessage(), 0, $e);
            }

            return ['status' => 'exception', 'message' => $e->getMessage()];
        }
    }

    /**
     * Build and normalize user_data payload with SHA-256 hashing
     */
    public function buildUserData(array $input): array
    {
        $userData = [];

        // Hashed PII (Never hash empty strings!)
        if (!empty($input['email'])) {
            $norm = strtolower(trim($input['email']));
            if (!empty($norm)) {
                $userData['em'] = [hash('sha256', $norm)];
            }
        }

        if (!empty($input['phone'])) {
            $normPhone = $this->normalizePhone($input['phone']);
            if (!empty($normPhone)) {
                $userData['ph'] = [hash('sha256', $normPhone)];
            }
        }

        if (!empty($input['full_name'])) {
            $parts = array_values(array_filter(explode(' ', trim($input['full_name']))));
            $firstName = strtolower(trim($parts[0] ?? ''));
            $lastName = strtolower(trim(implode(' ', array_slice($parts, 1))));

            if (!empty($firstName)) {
                $userData['fn'] = [hash('sha256', $firstName)];
            }
            if (!empty($lastName)) {
                $userData['ln'] = [hash('sha256', $lastName)];
            }
        }

        if (!empty($input['city'])) {
            $norm = strtolower(trim($input['city']));
            if (!empty($norm)) {
                $userData['ct'] = [hash('sha256', $norm)];
            }
        }

        // Country code (default 'tn' for Tunisia, configurable if passed)
        $countryCode = !empty($input['country']) ? strtolower(trim($input['country'])) : 'tn';
        if (!empty($countryCode)) {
            $userData['country'] = [hash('sha256', $countryCode)];
        }

        // Unhashed Browser & Context Identifiers
        $clientIp = $this->getClientIp($input);
        if (!empty($clientIp)) {
            $userData['client_ip_address'] = $clientIp;
        }

        $userAgent = $input['client_user_agent'] ?? (!app()->runningInConsole() && request()->hasHeader('User-Agent') ? request()->userAgent() : null);
        if (!empty($userAgent)) {
            $userData['client_user_agent'] = $userAgent;
        }

        if (!empty($input['fbp'])) {
            $userData['fbp'] = $input['fbp'];
        }
        if (!empty($input['fbc'])) {
            $userData['fbc'] = $input['fbc'];
        }

        return $userData;
    }

    /**
     * Robust phone normalization for Meta E.164
     * Handles: +216 20 123 456, 0021620123456, 216-20-123-456, 0020123456, 20 123 456
     */
    public function normalizePhone(?string $phone): string
    {
        if (empty($phone)) {
            return '';
        }

        $digits = preg_replace('/\D/', '', $phone);
        if (empty($digits)) {
            return '';
        }

        // Strip leading 00 international prefix
        if (str_starts_with($digits, '00')) {
            $digits = substr($digits, 2);
        }

        // If local 8-digit number (e.g. 20123456), prepend 216
        if (strlen($digits) === 8) {
            return '216' . $digits;
        }

        // If 9-digit number starting with 0 (e.g. 020123456), strip 0 and prepend 216
        if (strlen($digits) === 9 && str_starts_with($digits, '0')) {
            return '216' . substr($digits, 1);
        }

        return $digits;
    }

    /**
     * Proxy-aware client IP extraction
     */
    protected function getClientIp(array $input): ?string
    {
        if (!empty($input['client_ip_address'])) {
            return $input['client_ip_address'];
        }

        // When executing inside a Queue Worker / CLI process, do not fallback to CLI request IP
        if (app()->runningInConsole()) {
            return null;
        }

        $req = request();
        if ($req->header('CF-Connecting-IP')) {
            return $req->header('CF-Connecting-IP');
        }

        if ($req->header('X-Forwarded-For')) {
            $ips = explode(',', $req->header('X-Forwarded-For'));
            return trim($ips[0]);
        }

        return $req->ip();
    }
}
