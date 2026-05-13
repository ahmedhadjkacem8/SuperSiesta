<?php

namespace App\Http\Controllers\Api;

use App\Models\Prospect;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class ProspectController extends BaseController
{
    /**
     * Display a listing of the resource for admin.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Prospect::query();

        if ($request->has('status')) {
            $query->where('status', $request->status);
        } else {
            // Par défaut, ne pas afficher les prospects déjà convertis
            $query->where('status', '!=', 'converti');
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('full_name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        $prospects = $query->orderBy('created_at', 'desc')->paginate($request->get('per_page', 15));

        return $this->sendResponse($prospects, 'Prospects retrieved successfully');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'id' => 'nullable|uuid',
            'full_name' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:20',
            'phone2' => 'nullable|string|max:20',
            'address' => 'nullable|string|max:255',
            'city' => 'nullable|string|max:100',
            'notes' => 'nullable|string',
            'cart_items' => 'nullable|array',
            'total' => 'nullable|numeric',
            'status' => 'nullable|string|in:nouveau,contacté,converti,abandonné',
        ]);

        if ($request->has('id') && $request->id) {
            $prospect = Prospect::find($request->id);
        } else {
            // Tenter de trouver un prospect existant non converti par téléphone ou email
            $prospect = null;
            if ($request->filled('phone') || $request->filled('email')) {
                $prospect = Prospect::where('status', '!=', 'converti')
                    ->where(function($q) use ($request) {
                        if ($request->filled('phone')) {
                            $q->where('phone', $request->phone);
                        }
                        if ($request->filled('email')) {
                            $q->orWhere('email', $request->email);
                        }
                    })
                    ->first();
            }
        }

        if ($prospect) {
            $prospect->update($validated);
            return $this->sendResponse($prospect, 'Prospect updated successfully');
        }

        $prospect = Prospect::create($validated);

        return $this->sendResponse($prospect, 'Prospect created successfully', 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Prospect $prospect): JsonResponse
    {
        return $this->sendResponse($prospect, 'Prospect retrieved successfully');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Prospect $prospect): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'nullable|string|in:nouveau,contacté,converti,abandonné',
            'notes' => 'nullable|string',
            'full_name' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string|max:255',
            'city' => 'nullable|string|max:100',
        ]);

        $prospect->update($validated);

        return $this->sendResponse($prospect, 'Prospect updated successfully');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Prospect $prospect): JsonResponse
    {
        $prospect->delete();

        return $this->sendResponse(null, 'Prospect deleted successfully');
    }
}
