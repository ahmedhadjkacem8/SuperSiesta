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

        foreach ($tokens as $token) {
            try {
                if ($token->platform === 'android') {
                    $this->sendFcm($token->token, $notification);
                } elseif ($token->platform === 'ios') {
                    $this->sendApns($token->token, $notification);
                }
            } catch (RuntimeException $exception) {
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

        if ($projectId === '' || $clientEmail === '' || $privateKey === '') {
            Log::warning('FCM is not configured; Android push was skipped.');
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
            throw new RuntimeException('FCM rejected the push.', $response['status']);
        }
    }

    private function sendApns(string $token, Notification $notification): void
    {
        $teamId = (string) config('services.push.apns.team_id');
        $keyId = (string) config('services.push.apns.key_id');
        $privateKey = str_replace('\\n', "\n", (string) config('services.push.apns.private_key'));
        $bundleId = (string) config('services.push.apns.bundle_id');

        if ($teamId === '' || $keyId === '' || $privateKey === '' || $bundleId === '') {
            Log::warning('APNs is not configured; iOS push was skipped.');
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
    }

    private function curlJson(string $url, array $payload, array $headers, bool $http2 = false): array
    {
        $handle = curl_init($url);
        curl_setopt_array($handle, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => str_contains(implode('', $headers), 'application/x-www-form-urlencoded')
                ? http_build_query($payload)
                : json_encode($payload, JSON_THROW_ON_ERROR),
            CURLOPT_HTTPHEADER => array_merge(
                $http2 ? ['Content-Type: application/json'] : [],
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
