<?php

namespace App\Http\Controllers\Api;

use App\Models\Compteur;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class CompteurController extends BaseController
{
    public function index(): JsonResponse
    {
        return $this->sendResponse(Compteur::all(), 'Compteurs retrieved successfully');
    }

    public function update(Request $request, $id): JsonResponse
    {
        $compteur = Compteur::findOrFail($id);

        $validated = $request->validate([
            'prefix' => 'nullable|string|max:20',
            'suffix' => 'nullable|string|max:20',
            'numero' => 'required|integer|min:0',
        ]);

        $compteur->update($validated);

        return $this->sendResponse($compteur, 'Compteur updated successfully');
    }
}
