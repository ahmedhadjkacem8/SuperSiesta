<?php

namespace Tests\Unit;

use App\Services\MetaConversionsApiService;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class MetaConversionsApiServiceTest extends TestCase
{
    protected MetaConversionsApiService $service;

    protected function setUp(): void
    {
        parent::setUp();
        Config::set('services.meta.pixel_id', '1012351344935449');
        Config::set('services.meta.access_token', 'test_access_token');
        Config::set('services.meta.test_event_code', 'TEST12345');

        $this->service = new MetaConversionsApiService();
    }

    #[Test]
    public function it_normalizes_and_hashes_user_data_correctly()
    {
        $input = [
            'email' => '  Test.User@Example.COM  ',
            'phone' => ' 20123456 ',
            'full_name' => ' Mohamed Ali ',
            'city' => ' Tunis ',
        ];

        $userData = $this->service->buildUserData($input);

        $this->assertEquals([hash('sha256', 'test.user@example.com')], $userData['em']);
        $this->assertEquals([hash('sha256', '21620123456')], $userData['ph']);
        $this->assertEquals([hash('sha256', 'mohamed')], $userData['fn']);
        $this->assertEquals([hash('sha256', 'ali')], $userData['ln']);
        $this->assertEquals([hash('sha256', 'tunis')], $userData['ct']);
        $this->assertEquals([hash('sha256', 'tn')], $userData['country']);
    }

    #[Test]
    public function it_normalizes_phone_numbers_in_various_formats_to_e164()
    {
        $phoneVariants = [
            '+216 20 123 456'  => '21620123456',
            '0021620123456'    => '21620123456',
            '216-20-123-456'   => '21620123456',
            '0020123456'       => '21620123456',
            '20 123 456'        => '21620123456',
            '020123456'        => '21620123456',
        ];

        foreach ($phoneVariants as $rawPhone => $expectedNormalized) {
            $normalized = $this->service->normalizePhone($rawPhone);
            $this->assertEquals(
                $expectedNormalized,
                $normalized,
                "Failed normalizing phone number [{$rawPhone}]. Expected [{$expectedNormalized}], got [{$normalized}]."
            );
        }
    }

    #[Test]
    public function it_handles_missing_or_partial_pii_without_hashing_empty_strings()
    {
        $input = [
            'email' => '',
            'phone' => null,
            'full_name' => '   ',
            'city' => null,
        ];

        $userData = $this->service->buildUserData($input);

        // Verify no empty hashes were added
        $this->assertArrayNotHasKey('em', $userData);
        $this->assertArrayNotHasKey('ph', $userData);
        $this->assertArrayNotHasKey('fn', $userData);
        $this->assertArrayNotHasKey('ln', $userData);
        $this->assertArrayNotHasKey('ct', $userData);

        // Default country hash for Tunisia should still be present
        $this->assertEquals([hash('sha256', 'tn')], $userData['country']);
    }

    #[Test]
    public function it_handles_custom_country_code_override_if_provided()
    {
        $input = [
            'country' => 'FR',
        ];

        $userData = $this->service->buildUserData($input);

        $this->assertEquals([hash('sha256', 'fr')], $userData['country']);
    }

    #[Test]
    public function it_handles_graph_api_error_responses_gracefully_without_throwing_exceptions()
    {
        Http::fake([
            'https://graph.facebook.com/v18.0/*' => Http::response([
                'error' => [
                    'message' => 'Invalid OAuth access token.',
                    'type' => 'OAuthException',
                    'code' => 190,
                ],
            ], 400),
        ]);

        $result = $this->service->sendEvent('Purchase', ['email' => 'user@test.tn'], ['value' => 100], 'event-err-123');

        $this->assertEquals('error', $result['status']);
        $this->assertEquals(400, $result['code']);
        $this->assertStringContainsString('Invalid OAuth access token', $result['message']);
    }

    #[Test]
    public function it_sends_purchase_event_payload_with_strict_tnd_currency_fbp_fbc_and_full_custom_data_to_meta_graph_api()
    {
        Http::fake([
            'https://graph.facebook.com/v18.0/*' => Http::response(['events_received' => 1, 'messages' => []], 200),
        ]);

        $userData = [
            'email' => 'client@supersiesta.tn',
            'phone' => '+216 20 123 456',
            'full_name' => 'Foulen Ben Foulen',
            'city' => 'Sousse',
            'fbp' => 'fb.1.1600000000.123456789',
            'fbc' => 'fb.1.1600000000.IwAR0123456789',
        ];

        $customData = [
            'value' => 1250.000,
            'currency' => 'TND',
            'content_type' => 'product',
            'content_ids' => ['prod-uuid-1', 'prod-uuid-2'],
            'num_items' => 2,
            'order_id' => 'CMD-20260802-1234',
        ];

        $eventId = 'uuid-event-purchase-999';

        $result = $this->service->sendEvent('Purchase', $userData, $customData, $eventId);

        $this->assertEquals('success', $result['status']);

        // Assert full Graph API HTTP call structure including fbp, fbc, num_items, order_id
        Http::assertSent(function ($request) use ($eventId) {
            $data = json_decode($request->body(), true) ?? [];
            $event = $data['data'][0] ?? [];
            $userDataPayload = $event['user_data'] ?? [];
            $customDataPayload = $event['custom_data'] ?? [];

            return str_contains($request->url(), 'graph.facebook.com/v18.0/1012351344935449/events')
                && $event['event_name'] === 'Purchase'
                && $event['event_id'] === $eventId
                && $event['action_source'] === 'website'
                // Check unhashed identifiers fbp and fbc
                && ($userDataPayload['fbp'] ?? null) === 'fb.1.1600000000.123456789'
                && ($userDataPayload['fbc'] ?? null) === 'fb.1.1600000000.IwAR0123456789'
                // Check strict custom_data fields
                && $customDataPayload['currency'] === 'TND'
                && $customDataPayload['value'] == 1250.0
                && ($customDataPayload['num_items'] ?? null) === 2
                && ($customDataPayload['order_id'] ?? null) === 'CMD-20260802-1234'
                && ($customDataPayload['content_ids'] ?? []) === ['prod-uuid-1', 'prod-uuid-2'];
        });
    }

    #[Test]
    public function it_strictly_enforces_tnd_currency_even_if_caller_attempts_to_override_it()
    {
        Http::fake([
            'https://graph.facebook.com/v18.0/*' => Http::response(['events_received' => 1], 200),
        ]);

        // Attempting to pass EUR or USD currency override in customData
        $customData = [
            'value' => 500,
            'currency' => 'EUR', // Should be ignored and forced to TND
        ];

        $this->service->sendEvent('ViewContent', [], $customData, 'event-curr-override');

        Http::assertSent(function ($request) {
            $data = json_decode($request->body(), true) ?? [];
            $custom = $data['data'][0]['custom_data'] ?? [];

            // Currency MUST be TND even if caller passed EUR
            return $custom['currency'] === 'TND';
        });
    }

    #[Test]
    public function it_throws_on_retryable_5xx_server_error_when_throwOnRetryableError_is_true()
    {
        Http::fake([
            'https://graph.facebook.com/v18.0/*' => Http::response('Internal Server Error', 500),
        ]);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Meta CAPI Server Error [500]');

        $this->service->sendEvent(
            'Purchase',
            ['email' => 'user@test.tn'],
            ['value' => 100],
            'event-retry-500',
            null,
            true // throwOnRetryableError
        );
    }

    #[Test]
    public function it_throws_on_retryable_429_rate_limit_when_throwOnRetryableError_is_true()
    {
        Http::fake([
            'https://graph.facebook.com/v18.0/*' => Http::response('Rate limit exceeded', 429),
        ]);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Meta CAPI Server Error [429]');

        $this->service->sendEvent(
            'Purchase',
            ['email' => 'user@test.tn'],
            ['value' => 100],
            'event-retry-429',
            null,
            true
        );
    }

    #[Test]
    public function it_does_not_throw_on_non_retryable_4xx_client_error_even_with_throwOnRetryableError()
    {
        Http::fake([
            'https://graph.facebook.com/v18.0/*' => Http::response([
                'error' => ['message' => 'Invalid OAuth access token.', 'code' => 190],
            ], 400),
        ]);

        // Should NOT throw — 400 is a permanent client error, not retryable
        $result = $this->service->sendEvent(
            'Purchase',
            ['email' => 'user@test.tn'],
            ['value' => 100],
            'event-no-retry-400',
            null,
            true
        );

        $this->assertEquals('error', $result['status']);
        $this->assertEquals(400, $result['code']);
    }
}
