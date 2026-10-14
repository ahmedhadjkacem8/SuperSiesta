<?php

namespace Tests\Feature;

use App\Jobs\SendMetaCapiEventJob;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class MetaEventControllerTest extends TestCase
{
    public function test_add_to_cart_without_a_valid_value_is_rejected_without_queueing(): void
    {
        Queue::fake();

        $this->postJson('/api/meta/event', [
            'event_name' => 'AddToCart',
            'event_id' => 'event-invalid-value',
            'custom_data' => ['currency' => 'TND'],
        ])->assertStatus(422);

        $this->postJson('/api/meta/event', [
            'event_name' => 'AddToCart',
            'event_id' => 'event-zero-value',
            'custom_data' => ['value' => 0, 'currency' => 'TND'],
        ])->assertStatus(422);

        Queue::assertNothingPushed();
    }

    public function test_add_to_cart_with_a_numeric_value_is_queued(): void
    {
        Queue::fake();

        $this->postJson('/api/meta/event', [
            'event_name' => 'AddToCart',
            'event_id' => 'event-valid-value',
            'custom_data' => [
                'value' => '24.5',
                'currency' => 'eur',
            ],
        ])->assertOk();

        Queue::assertPushed(SendMetaCapiEventJob::class);
    }
}
