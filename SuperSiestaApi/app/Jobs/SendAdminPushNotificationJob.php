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
    public bool $afterCommit = true;

    public function __construct(public string $notificationId)
    {
    }

    public function handle(PushNotificationService $pushNotifications): void
    {
        $notification = Notification::query()->find($this->notificationId);
        if (!$notification || $notification->user_id !== null) {
            return;
        }

        $pushNotifications->sendToNotification($notification);
    }

    public function failed(Throwable $exception): void
    {
        Log::error('Admin push notification failed.', [
            'notification_id' => $this->notificationId,
            'error' => $exception->getMessage(),
        ]);
    }
}
