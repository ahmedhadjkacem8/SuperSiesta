<?php

namespace App\Jobs;

use App\Models\Notification;
use App\Services\PushNotificationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Throwable;

class SendAdminPushNotificationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $timeout = 60;

    public function __construct(public string $notificationId)
    {
        $this->afterCommit = true;
    }

    public function handle(PushNotificationService $pushNotifications): void
    {
        Log::info('[PUSH_JOB] JOB_STARTED', [
            'timestamp' => now()->toIso8601String(),
            'notification_id' => $this->notificationId,
            'attempt' => $this->attempts(),
        ]);

        $notification = Notification::query()->find($this->notificationId);
        if (!$notification || $notification->user_id !== null) {
            Log::warning('[PUSH_JOB] NOTIFICATION_NOT_FOUND_OR_NOT_ADMIN', [
                'timestamp' => now()->toIso8601String(),
                'notification_id' => $this->notificationId,
            ]);
            return;
        }

        $pushNotifications->sendToNotification($notification);

        Log::info('[PUSH_JOB] JOB_COMPLETED', [
            'timestamp' => now()->toIso8601String(),
            'notification_id' => $this->notificationId,
        ]);
    }

    public function failed(Throwable $exception): void
    {
        Log::error('Admin push notification failed.', [
            'timestamp' => now()->toIso8601String(),
            'event' => 'JOB_FAILED',
            'notification_id' => $this->notificationId,
            'error' => $exception->getMessage(),
        ]);
    }
}
