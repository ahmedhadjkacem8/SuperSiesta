<?php

namespace App\Http\Controllers\Api;

use App\Models\SocialNetwork;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SocialNetworkController extends BaseController
{
    public function index(): JsonResponse
    {
        return $this->sendResponse(SocialNetwork::with('icon')->get(), 'Social networks retrieved successfully');
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string',
            'url' => 'required|string',
            'icon_id' => 'required|exists:icons,id',
            'is_active' => 'boolean',
        ]);

        $social = SocialNetwork::create($validated);
        return $this->sendResponse($social->load('icon'), 'Social network created successfully');
    }

    public function update(Request $request, $id): JsonResponse
    {
        $social = SocialNetwork::findOrFail($id);
        $validated = $request->validate([
            'name' => 'string',
            'url' => 'string',
            'icon_id' => 'exists:icons,id',
            'is_active' => 'boolean',
        ]);

        $social->update($validated);
        return $this->sendResponse($social->load('icon'), 'Social network updated successfully');
    }

    public function destroy($id): JsonResponse
    {
        $social = SocialNetwork::findOrFail($id);
        $social->delete();
        return $this->sendResponse([], 'Social network deleted successfully');
    }
}
