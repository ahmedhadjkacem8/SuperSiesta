<?php

namespace App\Http\Controllers\Api;

use App\Models\Client;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class ClientController extends BaseController
{
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Client::class);

        $query = Client::query();

        if ($request->has('search')) {
            $search = $request->search;
            $query->where('full_name', 'like', "%$search%")
                ->orWhere('email', 'like', "%$search%")
                ->orWhere('phone', 'like', "%$search%");
        }

        $clients = $query->paginate($request->get('per_page', 15));

        return $this->sendResponse($clients, 'Clients retrieved successfully');
    }

    public function show(Client $client): JsonResponse
    {
        $this->authorize('view', $client);

        $client->load('quotes', 'invoices', 'orders');

        return $this->sendResponse($client, 'Client retrieved successfully');
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', Client::class);

        $validated = $request->validate([
            'full_name' => 'required|string|max:255',
            'email' => 'nullable|email|unique:clients',
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string',
            'city' => 'nullable|string|max:100',
            'notes' => 'nullable|string',
            'tags' => 'nullable|array',
        ]);

        $client = Client::create($validated);

        // Notifier l'admin
        try {
            app(\App\Services\NotificationService::class)->notifyNewClient($client);
        } catch (\Exception $e) { }

        return $this->sendResponse($client, 'Client created successfully', 201);
    }

    public function update(Request $request, Client $client): JsonResponse
    {
        $this->authorize('update', $client);

        $validated = $request->validate([
            'full_name' => 'string|max:255',
            'email' => 'email|unique:clients,email,' . $client->id,
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string',
            'city' => 'nullable|string|max:100',
            'notes' => 'nullable|string',
            'tags' => 'nullable|array',
        ]);

        $client->update($validated);

        return $this->sendResponse($client, 'Client updated successfully');
    }

    public function destroy(Client $client): JsonResponse
    {
        $this->authorize('delete', $client);

        $client->delete();

        return $this->sendResponse(null, 'Client deleted successfully');
    }

    public function quotes(Client $client): JsonResponse
    {
        $this->authorize('view', $client);
        return $this->sendResponse($client->quotes, 'Client quotes retrieved successfully');
    }

    public function invoices(Client $client): JsonResponse
    {
        $this->authorize('view', $client);
        return $this->sendResponse($client->invoices, 'Client invoices retrieved successfully');
    }

    public function orders(Client $client): JsonResponse
    {
        $this->authorize('view', $client);
        return $this->sendResponse($client->orders, 'Client orders retrieved successfully');
    }

    public function reviews(Client $client): JsonResponse
    {
        $this->authorize('view', $client);
        return $this->sendResponse($client->reviews, 'Client reviews retrieved successfully');
    }
}
