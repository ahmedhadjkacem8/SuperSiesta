<?php

namespace App\Jobs;

use App\Services\MetaConversionsApiService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * SendMetaCapiEventJob
 *
 * Dispatches Meta Conversions API events asynchronously via Laravel Queue.
 * This ensures the checkout flow is never blocked by Meta API latency or errors.
 *
 * Usage:
 *   SendMetaCapiEventJob::dispatch('Purchase', $userData, $customData, $eventId);
 */
class SendMetaCapiEventJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Number of retry attempts before the job fails permanently.
     */
    public int $tries = 3;

    /**
     * Number of seconds to wait before retrying.
     */
    public array $backoff = [5, 30, 120];

    public function __construct(
        protected string $eventName,
        protected array  $userData,
        protected array  $customData,
        protected ?string $eventId = null,
        protected ?string $eventSourceUrl = null,
    ) {}

    public function handle(MetaConversionsApiService $service): void
    {
        $result = $service->sendEvent(
            $this->eventName,
            $this->userData,
            $this->customData,
            $this->eventId,
            $this->eventSourceUrl,
            true // throwOnRetryableError: enables Laravel Queue worker retries on 5xx server errors / timeouts
        );

        if ($result['status'] === 'error') {
            $errorCode = $result['code'] ?? '4xx';
            Log::warning("Meta CAPI Job: Permanent client error [{$errorCode}] for event [{$this->eventName}].", [
                'event_id' => $this->eventId,
                'result'   => $result,
            ]);
        }
    }

    /**
     * Handle a job failure — log but never block business logic.
     */
    public function failed(?\Throwable $exception): void
    {
        Log::error("Meta CAPI Job FAILED permanently for event [{$this->eventName}].", [
            'event_id'  => $this->eventId,
            'exception' => $exception?->getMessage(),
        ]);
    }
}
