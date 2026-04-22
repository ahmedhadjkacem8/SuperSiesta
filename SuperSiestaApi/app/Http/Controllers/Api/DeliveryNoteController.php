<?php

namespace App\Http\Controllers\Api;

use App\Models\DeliveryNote;
use App\Models\DeliveryNoteItem;
use App\Models\Compteur;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class DeliveryNoteController extends BaseController
{
    public function nextNumber(): JsonResponse
    {
        return $this->sendResponse(['next_number' => Compteur::generateNumber('bon_livraison')], 'Next delivery note number generated');
    }

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', DeliveryNote::class);

        $query = DeliveryNote::query();

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('order_id')) {
            $query->where('order_id', $request->order_id);
        }

        $notes = $query->with('items', 'order', 'client', 'deliveryMan')
            ->orderBy('created_at', 'desc')
            ->orderBy('delivery_number', 'desc')
            ->paginate($request->get('per_page', 15));

        return $this->sendResponse($notes, 'Delivery notes retrieved successfully');
    }

    public function show(DeliveryNote $note): JsonResponse
    {
        $this->authorize('view', $note);

        $note->load('items', 'order', 'client', 'deliveryMan');

        return $this->sendResponse($note, 'Delivery note retrieved successfully');
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', DeliveryNote::class);

        $validated = $request->validate([
            'delivery_number' => 'required|string|unique:delivery_notes',
            'order_id' => 'nullable|uuid|exists:orders,id',
            'client_id' => 'nullable|uuid|exists:clients,id',
            'status' => 'string|in:preparation,en_livraison,livrée,retour,annulée',
            'delivery_address' => 'nullable|string',
            'delivery_city' => 'nullable|string',
            'full_name' => 'required|string',
            'phone' => 'nullable|string',
            'phone2' => 'nullable|string',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.product_name' => 'required|string',
            'items.*.size_label' => 'string',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.grammage' => 'nullable|string',
            'delivery_man_id' => 'nullable|uuid|exists:delivery_men,id',
            'delivery_man_name' => 'nullable|string',
        ]);

        $note = DeliveryNote::create([
            'delivery_number' => $validated['delivery_number'],
            'order_id' => $validated['order_id'] ?? null,
            'client_id' => $validated['client_id'] ?? null,
            'status' => $validated['status'] ?? 'preparation',
            'delivery_address' => $validated['delivery_address'] ?? null,
            'delivery_city' => $validated['delivery_city'] ?? null,
            'full_name' => $validated['full_name'],
            'phone' => $validated['phone'] ?? null,
            'phone2' => $validated['phone2'] ?? null,
            'notes' => $validated['notes'] ?? null,
            'delivery_man_id' => $validated['delivery_man_id'] ?? null,
            'delivery_man_name' => $validated['delivery_man_name'] ?? null,
        ]);

        foreach ($validated['items'] as $item) {
            $note->items()->create([
                'product_name' => $item['product_name'],
                'size_label' => $item['size_label'] ?? '',
                'quantity' => $item['quantity'],
                'delivered_quantity' => 0,
                'grammage' => $item['grammage'] ?? null,
            ]);
        }

        return $this->sendResponse($note->load('items'), 'Delivery note created successfully', 201);
    }

    public function update(Request $request, DeliveryNote $note): JsonResponse
    {
        $this->authorize('update', $note);

        $validated = $request->validate([
            'status' => 'string|in:preparation,en_livraison,livrée,retour,annulée',
            'delivery_address' => 'nullable|string',
            'delivery_city' => 'nullable|string',
            'full_name' => 'string',
            'phone' => 'nullable|string',
            'phone2' => 'nullable|string',
            'notes' => 'nullable|string',
            'delivered_at' => 'nullable|datetime',
            'delivery_man_id' => 'nullable|uuid|exists:delivery_men,id',
            'delivery_man_name' => 'nullable|string',
        ]);

        $note->update($validated);

        $oldStatus = $note->status;

        // Lors du passage en 'livrée', créer une entrée de trésorerie (si rattachée à une commande)
        if ($oldStatus !== 'livrée' && $request->status === 'livrée' && $note->order) {
            // Eviter doublons : utiliser la référence pour lier l'entrée
            $reference = 'delivery_note:' . $note->id;
            $exists = \App\Models\TreasuryEntry::where('reference', $reference)->exists();
            if (!$exists) {
                \App\Models\TreasuryEntry::create([
                    'type' => 'entrée',
                    'category' => 'Vente BL',
                    'amount' => $note->order->total ?? 0,
                    'description' => 'Produit vendu - Bon de livraison ' . $note->delivery_number,
                    'reference' => $reference,
                    'entry_date' => now()->toDateString(),
                    'created_at' => now(),
                ]);
            }
        }

        // Si le BL devient 'retour', supprimer/annuler l'entrée de trésorerie liée
        if ($request->status === 'retour') {
            $reference = 'delivery_note:' . $note->id;
            \App\Models\TreasuryEntry::where('reference', $reference)->delete();
        }
        return $this->sendResponse($note, 'Delivery note updated successfully');
    }

    public function destroy(DeliveryNote $note): JsonResponse
    {
        $this->authorize('delete', $note);

        $note->items()->delete();
        $note->delete();

        return $this->sendResponse(null, 'Delivery note deleted successfully');
    }

    /**
     * Get items for a delivery note
     */
    public function items(DeliveryNote $note): JsonResponse
    {
        $this->authorize('view', $note);
        $items = $note->items()->with('product.freeGifts')->get();
        return $this->sendResponse($items, 'Items retrieved successfully');
    }

    /**
     * Update status specifically
     */
    public function updateStatus(Request $request, DeliveryNote $note): JsonResponse
    {
        $this->authorize('update', $note);
        $request->validate(['status' => 'required|string|in:preparation,en_livraison,livrée,retour,annulée']);

        $oldStatus = $note->status;
        $note->update(['status' => $request->status]);

        if ($oldStatus !== 'livrée' && $request->status === 'livrée' && $note->order) {
            $reference = 'delivery_note:' . $note->id;
            $exists = \App\Models\TreasuryEntry::where('reference', $reference)->exists();
            if (!$exists) {
                \App\Models\TreasuryEntry::create([
                    'type' => 'entrée',
                    'category' => 'Vente BL',
                    'amount' => $note->order->total ?? 0,
                    'description' => 'Produit vendu - Bon de livraison ' . $note->delivery_number,
                    'reference' => $reference,
                    'entry_date' => now()->toDateString(),
                    'created_at' => now(),
                ]);
            }
        }

        if ($request->status === 'retour') {
            $reference = 'delivery_note:' . $note->id;
            \App\Models\TreasuryEntry::where('reference', $reference)->delete();
        }

        return $this->sendResponse($note, 'Status updated successfully');
    }

    /**
     * Update a single item (qty delivered)
     */
    public function updateItem(Request $request, $itemId): JsonResponse
    {
        $item = DeliveryNoteItem::findOrFail($itemId);
        $this->authorize('update', $item->deliveryNote);
        
        $validated = $request->validate([
            'delivered_quantity' => 'nullable|integer|min:0',
            'gifts_grammage' => 'nullable|array',
        ]);
        
        $item->update($validated);
        return $this->sendResponse($item, 'Item updated successfully');
    }

    public function fromOrder(Request $request, \App\Models\Order $order): JsonResponse
    {
        $this->authorize('create', DeliveryNote::class);

        // Empêcher la création multiple: retourner le BL existant s'il y en a déjà un
        if ($order->deliveryNotes()->exists()) {
            $existing = $order->deliveryNotes()->with('items')->first();
            return $this->sendResponse($existing, 'Delivery note already exists for this order', 200);
        }

        // Tentative de liaison avec un Client existant par email
        $clientId = null;
        if ($order->user_id) {
            $client = \App\Models\Client::where('email', $order->user->email)->first();
            if ($client) $clientId = $client->id;
        }

        $note = DeliveryNote::create([
            'delivery_number' => Compteur::generateNumber('bon_livraison'),
            'order_id' => $order->id,
            'client_id' => $clientId,
            'status' => 'preparation',
            'delivery_address' => $order->address,
            'delivery_city' => $order->city,
            'full_name' => $order->full_name,
            'phone' => $order->phone,
            'phone2' => $order->phone2,
            'notes' => $order->notes,
        ]);

        foreach ($order->items as $item) {
            $note->items()->create([
                'product_id'       => $item->product_id,
                'product_name'     => $item->product_name,
                'size_label'       => $item->size_label,
                'quantity'         => $item->quantity,
                'delivered_quantity' => $item->quantity, // Par défaut on livre tout au début
                'grammage'         => $item->grammage,
            ]);
        }

        return $this->sendResponse($note->load('items'), 'Delivery note created from order', 201);
    }
}
