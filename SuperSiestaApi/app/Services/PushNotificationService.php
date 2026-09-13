<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\PushToken;
use Firebase\JWT\JWT;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class PushNotificationService
{
    public function sendToNotification(Notification $notification): void
    {
        $tokens = PushToken::query()
            ->active()
            ->whereHas('user', fn ($query) => $query->whereHas('roles', fn ($roles) => $roles->where('role', 'admin')))
            ->get();

        Log::info('[PUSH_SERVICE] TOKENS_FOUND', [
            'timestamp' => now()->toIso8601String(),
            'notification_id' => $notification->id,
            'count' => $tokens->count(),
        ]);

        foreach ($tokens as $token) {
            try {
                Log::info('[PUSH_SERVICE] TOKEN_SEND_STARTED', [
                    'timestamp' => now()->toIso8601String(),
                    'notification_id' => $notification->id,
                    'push_token_id' => $token->id,
                    'platform' => $token->platform,
                ]);

                if ($token->platform === 'android') {
                    $this->sendFcm($token->token, $notification);
                } elseif ($token->platform === 'ios') {
                    $this->sendApns($token->token, $notification);
                }

                Log::info('[PUSH_SERVICE] TOKEN_SEND_COMPLETED', [
                    'timestamp' => now()->toIso8601String(),
                    'notification_id' => $notification->id,
                    'push_token_id' => $token->id,
                    'platform' => $token->platform,
                ]);
            } catch (RuntimeException $exception) {
                Log::error('[PUSH_SERVICE] TOKEN_SEND_FAILED', [
                    'timestamp' => now()->toIso8601String(),
                    'notification_id' => $notification->id,
                    'push_token_id' => $token->id,
                    'platform' => $token->platform,
                    'status' => $exception->getCode(),
                    'error' => $exception->getMessage(),
                ]);

                if ($this->isInvalidToken($exception->getCode())) {
                    $token->update(['revoked_at' => now()]);
                    Log::warning('Revoked invalid push token.', ['push_token_id' => $token->id]);
                    continue;
                }

                throw $exception;
            }
        }
    }

    private function sendFcm(string $token, Notification $notification): void
    {
        $projectId = (string) config('services.push.firebase.project_id');
        $clientEmail = (string) config('services.push.firebase.client_email');
        $privateKey = str_replace('\\n', "\n", (string) config('services.push.firebase.private_key'));

        $credentialsFile = (string) config('services.push.firebase.credentials_file');
        if ($credentialsFile !== '' && is_readable($credentialsFile)) {
            $credentials = json_decode((string) file_get_contents($credentialsFile), true);
            if (is_array($credentials)) {
                $projectId = (string) ($credentials['project_id'] ?? $projectId);
                $clientEmail = (string) ($credentials['client_email'] ?? $clientEmail);
                $privateKey = (string) ($credentials['private_key'] ?? $privateKey);
            }
        }

        $missing = array_keys(array_filter([
            'FIREBASE_PROJECT_ID' => $projectId === '',
            'FIREBASE_CLIENT_EMAIL' => $clientEmail === '',
            'FIREBASE_PRIVATE_KEY' => $privateKey === '',
        ]));

        if ($missing !== []) {
            Log::warning('[PUSH_FCM] CONFIG_MISSING', [
                'timestamp' => now()->toIso8601String(),
                'missing' => $missing,
            ]);
            return;
        }

        $now = time();
        $jwt = JWT::encode([
            'iss' => $clientEmail,
            'scope' => 'https://www.googleapis.com/auth/firebase.messaging',
            'aud' => 'https://oauth2.googleapis.com/token',
            'iat' => $now,
            'exp' => $now + 3600,
        ], $privateKey, 'RS256');

        $accessResponse = $this->curlJson(
            'https://oauth2.googleapis.com/token',
            ['grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer', 'assertion' => $jwt],
            ['Content-Type: application/x-www-form-urlencoded']
        );
        $accessToken = $accessResponse['body']['access_token'] ?? null;

        if (!$accessToken) {
            throw new RuntimeException('FCM access token was not returned.');
        }

        Log::info('[PUSH_FCM] ACCESS_TOKEN_CREATED', [
            'timestamp' => now()->toIso8601String(),
            'project_id' => $projectId,
        ]);

        $response = $this->curlJson(
            "https://fcm.googleapis.com/v1/projects/{$projectId}/messages:send",
            [
                'message' => [
                    'token' => $token,
                    'notification' => [
                        'title' => $notification->title,
                        'body' => $notification->message,
                    ],
                    'data' => [
                        'notification_id' => (string) $notification->id,
                        'type' => (string) $notification->type,
                        'path' => (string) ($notification->path ?? '/admin/commandes'),
                    ],
                    'android' => [
                        'priority' => 'HIGH',
                        'notification' => ['sound' => 'default'],
                    ],
                ],
            ],
            ['Authorization: Bearer ' . $accessToken]
        );

        if ($response['status'] >= 400) {
            Log::error('[PUSH_FCM] RESPONSE_ERROR', [
                'timestamp' => now()->toIso8601String(),
                'status' => $response['status'],
                'body' => $response['body'],
            ]);
            throw new RuntimeException('FCM rejected the push.', $response['status']);
        }

        Log::info('[PUSH_FCM] RESPONSE_SUCCESS', [
            'timestamp' => now()->toIso8601String(),
            'status' => $response['status'],
        ]);
    }

    private function sendApns(string $token, Notification $notification): void
    {
        $teamId = (string) config('services.push.apns.team_id');
        $keyId = (string) config('services.push.apns.key_id');
        $privateKey = str_replace('\\n', "\n", (string) config('services.push.apns.private_key'));
        $bundleId = (string) config('services.push.apns.bundle_id');

        if ($teamId === '' || $keyId === '' || $privateKey === '' || $bundleId === '') {
            Log::warning('[PUSH_APNS] CONFIG_MISSING', ['timestamp' => now()->toIso8601String()]);
            return;
        }

        $jwt = JWT::encode(
            ['iss' => $teamId, 'iat' => time()],
            $privateKey,
            'ES256',
            $keyId,
            ['kid' => $keyId]
        );
        $host = config('services.push.apns.sandbox') ? 'api.sandbox.push.apple.com' : 'api.push.apple.com';
        $response = $this->curlJson(
            "https://{$host}/3/device/{$token}",
            [
                'aps' => [
                    'alert' => ['title' => $notification->title, 'body' => $notification->message],
                    'sound' => 'default',
                    'badge' => 1,
                ],
                'notification_id' => (string) $notification->id,
                'type' => (string) $notification->type,
                'path' => (string) ($notification->path ?? '/admin/commandes'),
            ],
            [
                'authorization: bearer ' . $jwt,
                'apns-topic: ' . $bundleId,
                'apns-push-type: alert',
                'apns-priority: 10',
            ],
            true
        );

        if ($response['status'] >= 400) {
            throw new RuntimeException('APNs rejected the push.', $response['status']);
        }

        Log::info('[PUSH_APNS] RESPONSE_SUCCESS', [
            'timestamp' => now()->toIso8601String(),
            'status' => $response['status'],
            'sandbox' => (bool) config('services.push.apns.sandbox'),
        ]);
    }

    private function curlJson(string $url, array $payload, array $headers, bool $http2 = false): array
    {
        $isFormEncoded = str_contains(implode('', $headers), 'application/x-www-form-urlencoded');

        $handle = curl_init($url);
        curl_setopt_array($handle, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $isFormEncoded
                ? http_build_query($payload)
                : json_encode($payload, JSON_THROW_ON_ERROR),
            CURLOPT_HTTPHEADER => array_merge(
                $isFormEncoded ? [] : ['Content-Type: application/json'],
                $headers
            ),
            CURLOPT_TIMEOUT => 20,
            CURLOPT_HTTP_VERSION => $http2 ? CURL_HTTP_VERSION_2_0 : CURL_HTTP_VERSION_1_1,
        ]);

        $body = curl_exec($handle);
        $error = curl_error($handle);
        $status = (int) curl_getinfo($handle, CURLINFO_HTTP_CODE);
        curl_close($handle);

        if ($body === false) {
            throw new RuntimeException('Push provider connection failed: ' . $error);
        }

        $decoded = json_decode($body, true);
        return ['status' => $status, 'body' => is_array($decoded) ? $decoded : []];
    }

    private function isInvalidToken(int $status): bool
    {
        return in_array($status, [400, 404, 410], true);
    }
}
