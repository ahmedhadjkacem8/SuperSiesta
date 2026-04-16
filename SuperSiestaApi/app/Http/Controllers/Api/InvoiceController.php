<?php

namespace App\Http\Controllers\Api;

use App\Models\Invoice;
use App\Models\Quote;
use App\Models\Compteur;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class InvoiceController extends BaseController
{
    public function nextNumber(): JsonResponse
    {
        return $this->sendResponse(['next_number' => Compteur::generateNumber('facture')], 'Next invoice number generated');
    }

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Invoice::class);

        $query = Invoice::query();

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('client_id')) {
            $query->where('client_id', $request->client_id);
        }

        $invoices = $query->with('client', 'items')->paginate($request->get('per_page', 15));

        return $this->sendResponse($invoices, 'Invoices retrieved successfully');
    }

    public function show(Invoice $invoice): JsonResponse
    {
        $this->authorize('view', $invoice);

        $invoice->load('client', 'items', 'quote');

        return $this->sendResponse($invoice, 'Invoice retrieved successfully');
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', Invoice::class);

        $validated = $request->validate([
            'invoice_number' => 'required|string|unique:invoices',
            'client_id' => 'required|uuid|exists:clients,id',
            'quote_id' => 'nullable|uuid|exists:quotes,id',
            'order_id' => 'nullable|uuid|exists:orders,id',
            'status' => 'string|in:brouillon,envoyée,payée,annulée',
            'total' => 'required|numeric|min:0',
            'tax_rate' => 'numeric|min:0|max:100',
            'notes' => 'nullable|string',
            'due_date' => 'nullable|date',
        ]);

        $invoice = Invoice::create($validated);

        return $this->sendResponse($invoice, 'Invoice created successfully', 201);
    }

    public function update(Request $request, Invoice $invoice): JsonResponse
    {
        $this->authorize('update', $invoice);

        $validated = $request->validate([
            'status' => 'string|in:brouillon,envoyée,payée,annulée',
            'total' => 'numeric|min:0',
            'tax_rate' => 'numeric|min:0|max:100',
            'notes' => 'nullable|string',
            'due_date' => 'nullable|date',
            'paid_at' => 'nullable|datetime',
        ]);

        $invoice->update($validated);

        return $this->sendResponse($invoice, 'Invoice updated successfully');
    }

    public function destroy(Invoice $invoice): JsonResponse
    {
        $this->authorize('delete', $invoice);

        $invoice->items()->delete();
        $invoice->delete();

        return $this->sendResponse(null, 'Invoice deleted successfully');
    }

    public function fromQuote(Request $request, Quote $quote): JsonResponse
    {
        $this->authorize('create', Invoice::class);

        $invoice = Invoice::create([
            'invoice_number' => Compteur::generateNumber('facture'),
            'client_id' => $quote->client_id,
            'quote_id' => $quote->id,
            'status' => 'brouillon',
            'total' => $quote->total,
            'tax_rate' => 19,
        ]);

        foreach ($quote->items as $item) {
            $invoice->items()->create([
                'description' => $item->description,
                'quantity' => $item->quantity,
                'unit_price' => $item->unit_price,
                'total' => $item->total,
            ]);
        }

        return $this->sendResponse($invoice->load('items'), 'Invoice created from quote', 201);
    }

    /**
     * Convert Order to Invoice
     */
    public function fromOrder(Request $request, \App\Models\Order $order): JsonResponse
    {
        $this->authorize('create', Invoice::class);

        // Tentative de liaison avec un Client existant par email
        $clientId = null;
        if ($order->user_id) {
            $client = \App\Models\Client::where('email', $order->user->email)->first();
            if ($client) $clientId = $client->id;
        }

        $invoice = Invoice::create([
            'invoice_number' => Compteur::generateNumber('facture'),
            'client_id' => $clientId,
            'order_id' => $order->id,
            'status' => 'brouillon',
            'total' => $order->total,
            'tax_rate' => 19,
        ]);

        foreach ($order->items as $item) {
            $invoice->items()->create([
                'description' => $item->product_name . ' (' . $item->size_label . ')',
                'quantity' => $item->quantity,
                'unit_price' => $item->unit_price,
                'total' => $item->total,
            ]);
        }

        // Mettre à jour la commande avec l'ID de la facture
        $order->update(['invoice_id' => $invoice->id]);

        return $this->sendResponse($invoice->load('items'), 'Invoice created from order', 201);
    }
}
