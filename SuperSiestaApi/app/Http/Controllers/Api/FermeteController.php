<?php

namespace App\Http\Controllers\Api;

use App\Models\Fermete;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class FermeteController extends BaseController
{
    public function index(): JsonResponse
    {
        $fermetes = Fermete::orderBy('label', 'asc')->get();
        return $this->sendResponse($fermetes, 'Fermetes retrieved successfully');
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', Fermete::class);

        $validated = $request->validate([
            'label' => 'required|string|unique:fermetes|max:100',
        ]);

        $fermete = Fermete::create($validated);
        return $this->sendResponse($fermete, 'Fermete created successfully', 201);
    }

    public function show(Fermete $fermete): JsonResponse
    {
        return $this->sendResponse($fermete, 'Fermete retrieved successfully');
    }

    public function update(Request $request, Fermete $fermete): JsonResponse
    {
        $this->authorize('update', $fermete);

        $validated = $request->validate([
            'label' => 'required|string|unique:fermetes,label,' . $fermete->id . '|max:100',
        ]);

        $fermete->update($validated);
        return $this->sendResponse($fermete, 'Fermete updated successfully');
    }

    public function destroy(Fermete $fermete): JsonResponse
    {
        $this->authorize('delete', $fermete);

        $fermete->delete();
        return $this->sendResponse(null, 'Fermete deleted successfully');
    }
}
