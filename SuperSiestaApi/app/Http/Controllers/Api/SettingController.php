<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class SettingController extends BaseController
{
    public function index(): JsonResponse
    {
        $settings = Setting::all()->pluck('value', 'key');
        return $this->sendResponse($settings, 'Settings retrieved successfully');
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'settings' => 'required|array',
        ]);

        foreach ($validated['settings'] as $key => $value) {
            Setting::updateOrCreate(
                ['key' => $key],
                ['value' => $value]
            );
        }

        $settings = Setting::all()->pluck('value', 'key');
        return $this->sendResponse($settings, 'Settings updated successfully');
    }
}
