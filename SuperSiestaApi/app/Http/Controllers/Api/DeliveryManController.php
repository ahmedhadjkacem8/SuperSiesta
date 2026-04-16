<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DeliveryMan;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class DeliveryManController extends BaseController
{
    public function index(): JsonResponse
    {
        $deliveryMen = DeliveryMan::orderBy('name')->get();
        return $this->sendResponse($deliveryMen, 'Delivery men retrieved successfully');
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:50',
            'vehicle' => 'nullable|string|max:255',
            'is_active' => 'boolean',
        ]);

        $deliveryMan = DeliveryMan::create($validated);
        return $this->sendResponse($deliveryMan, 'Delivery man created successfully', 201);
    }

    public function show(DeliveryMan $deliveryMan): JsonResponse
    {
        return $this->sendResponse($deliveryMan, 'Delivery man retrieved successfully');
    }

    public function update(Request $request, DeliveryMan $deliveryMan): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'string|max:255',
            'phone' => 'nullable|string|max:50',
            'vehicle' => 'nullable|string|max:255',
            'is_active' => 'boolean',
        ]);

        $deliveryMan->update($validated);
        return $this->sendResponse($deliveryMan, 'Delivery man updated successfully');
    }

    public function destroy(DeliveryMan $deliveryMan): JsonResponse
    {
        $deliveryMan->delete();
        return $this->sendResponse(null, 'Delivery man deleted successfully');
    }
}
