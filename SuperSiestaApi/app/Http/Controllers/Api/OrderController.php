<?php

namespace App\Http\Controllers\Api;

use App\Models\Order;
use App\Models\Invoice;
use App\Models\Compteur;
use App\Models\Quote;
use App\Models\Product;
use App\Models\Dimension;
use App\Jobs\SendMetaCapiEventJob;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use App\Services\NotificationService;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class OrderController extends BaseController
{
    private function normalizeDimensionLabel(string $label): string
    {
        $normalized = preg_replace('/\s*[x×]\s*/iu', '×', trim($label)) ?? trim($label);

        return mb_strtolower($normalized);
    }

    private function hasNonStandardDimension(iterable $labels): bool
    {
        $nonStandardLabels = Dimension::query()
            ->where('is_standard', false)
            ->pluck('label')
            ->map(fn (string $label) => $this->normalizeDimensionLabel($label))
            ->all();

        foreach ($labels as $label) {
            if ($label !== null && in_array($this->normalizeDimensionLabel((string) $label), $nonStandardLabels, true)) {
                return true;
            }
        }

        return false;
    }

    public function nextNumber(): JsonResponse
    {
        return $this->sendResponse(['next_number' => Compteur::generateNumber('commande')], 'Next order number generated');
    }

    public function index(Request $request): JsonResponse
    {
        $query = Order::query();

        // Vérification du rôle admin - améliorer la détection
        $isAdmin = false;
        if ($request->user()) {
            $isAdmin = $request->user()->roles()->where('role', 'admin')->exists() || 
                      $request->user()->email === 'admin@supersiesta.com'; // Fallback
        }

        // Si pas admin ET pas en train de consulter les commandes de l'utilisateur, limiter aux propres commandes
        if (!$isAdmin && $request->user()) {
            $query->where('user_id', $request->user()->id);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $orders = $query->with(['items', 'invoice', 'user.profile', 'deliveryNotes'])->orderBy('created_at', 'desc')->paginate($request->get('per_page', 15));

        return $this->sendResponse($orders, 'Orders retrieved successfully');
    }

    /**
     * Admin route: Retourne TOUTES les commandes sans filtrage utilisateur
     */
    public function adminIndex(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Order::class);

        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
        ]);
        $search = trim($validated['search'] ?? '');
        $query = Order::query();

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($search !== '') {
            $escapedSearch = str_replace(['!', '%', '_'], ['!!', '!%', '!_'], mb_strtolower($search));
            $like = "%{$escapedSearch}%";
            $phoneDigits = preg_replace('/\D+/', '', $search);
            $phoneDigits = preg_replace('/^(?:00216|216)(?=\d{6,}$)/', '', $phoneDigits);

            $query->where(function ($searchQuery) use ($like, $phoneDigits) {
                foreach (['orders.order_number', 'orders.full_name', 'orders.email'] as $column) {
                    $searchQuery->orWhereRaw("LOWER({$column}) LIKE ? ESCAPE '!'", [$like]);
                }

                foreach (['orders.phone', 'orders.phone2'] as $column) {
                    $searchQuery->orWhereRaw("LOWER({$column}) LIKE ? ESCAPE '!'", [$like]);
                }

                if ($phoneDigits !== '') {
                    foreach (['orders.phone', 'orders.phone2'] as $column) {
                        $searchQuery->orWhereRaw($this->normalizedPhoneExpression($column) . ' LIKE ?', ["%{$phoneDigits}%"]);
                    }
                }

                $searchQuery->orWhereHas('client', function ($clientQuery) use ($like, $phoneDigits) {
                    $clientQuery->where(function ($contactQuery) use ($like, $phoneDigits) {
                        foreach (['full_name', 'email'] as $column) {
                            $contactQuery->orWhereRaw("LOWER({$column}) LIKE ? ESCAPE '!'", [$like]);
                        }

                        if ($phoneDigits !== '') {
                            $contactQuery->orWhereRaw($this->normalizedPhoneExpression('phone') . ' LIKE ?', ["%{$phoneDigits}%"]);
                        }
                    });
                });
            });
        }

        $orders = $query->with(['items', 'invoice', 'user.profile', 'deliveryNotes'])->orderBy('created_at', 'desc')->paginate($request->get('per_page', 15));

        return $this->sendResponse($orders, 'All orders retrieved successfully');
    }

    private function normalizedPhoneExpression(string $column): string
    {
        $digits = "REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE({$column}, ' ', ''), '-', ''), '.', ''), '+', ''), '(', ''), ')', ''), '/', '')";

        return "CASE
            WHEN {$digits} LIKE '00216%' THEN SUBSTR({$digits}, 6)
            WHEN {$digits} LIKE '216%' THEN SUBSTR({$digits}, 4)
            ELSE {$digits}
        END";
    }

    /**
     * Get orders for the current user (used in Mon Compte)
     * Even if the user is an admin, they should ONLY see their own orders here.
     */
    public function myOrders(Request $request): JsonResponse
    {
        $query = Order::query()->where('user_id', $request->user()->id);
        
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $orders = $query->with('items', 'invoice')->orderBy('created_at', 'desc')->paginate($request->get('per_page', 15));

        return $this->sendResponse($orders, 'My orders retrieved successfully');
    }

    public function show(Order $order): JsonResponse
    {
        $this->authorize('view', $order);

        $order->load('items', 'invoice', 'quote', 'deliveryNotes');
        $order->setAttribute(
            'has_payment_proof',
            $order->payment_proof_path !== null && Storage::disk('local')->exists($order->payment_proof_path)
        );

        return $this->sendResponse($order, 'Order retrieved successfully');
    }

    public function items(Order $order): JsonResponse
    {
        $this->authorize('view', $order);
        return $this->sendResponse($order->items, 'Order items retrieved successfully');
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'full_name' => 'required|string|max:255',
            'email' => 'required_if:create_account,true|nullable|email|max:255',
            'phone' => 'required|string|max:20',
            'phone2' => 'nullable|string|max:20',
            'address' => 'nullable|string|max:255',
            'city' => 'required|string|max:100',
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
            'notes' => 'nullable|string',
            'payment_proof' => 'nullable|file|mimes:pdf,jpg,jpeg,png,webp|max:10240',
            'create_account' => 'boolean',
            'password' => 'required_if:create_account,true|nullable|string|min:8',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|uuid|exists:products,id',
            'items.*.product_name' => 'required|string',
            'items.*.size_label' => 'required|string',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.grammage' => 'nullable|string',
            'gclid' => 'nullable|string|max:255',
            'gbraid' => 'nullable|string|max:255',
            'wbraid' => 'nullable|string|max:255',
            'ads_click_captured_at' => 'nullable|date',
        ]);

        $metaAttribution = $request->session()->get('meta_attribution');
        $hasMetaClick = is_array($metaAttribution) && !empty($metaAttribution['fbclid']);
        $submittedMetaEventId = $request->input('meta_event_id');
        $metaEventId = null;
        $metaEventSourceUrl = null;
        if ($hasMetaClick) {
            $metaEventId = is_string($submittedMetaEventId)
                && strlen($submittedMetaEventId) <= 100
                && preg_match('/^[A-Za-z0-9._:-]+$/', $submittedMetaEventId)
                    ? $submittedMetaEventId
                    : (string) Str::uuid();

            $candidateSourceUrl = $request->input('event_source_url') ?: $request->headers->get('referer');
            if (
                !is_string($candidateSourceUrl)
                || strlen($candidateSourceUrl) > 1000
                || !filter_var($candidateSourceUrl, FILTER_VALIDATE_URL)
            ) {
                $candidateSourceUrl = config('app.url', 'http://localhost');
            }
            $metaEventSourceUrl = $candidateSourceUrl;
        }

        $user = Auth::guard('sanctum')->user();
        $token = null;
        $clientId = null;

        // Si l'utilisateur n'est pas connecté et veut créer un compte
        if (!$user && $request->boolean('create_account')) {
            // Vérifier si l'email existe déjà
            if (\App\Models\User::where('email', $validated['email'])->exists()) {
                return $this->sendError('Validation Error', ['email' => ['Cet email est déjà utilisé. Veuillez vous connecter ou utiliser un autre email.']], 422);
            }

            // Créer l'utilisateur
            $user = \App\Models\User::create([
                'name' => $validated['full_name'],
                'email' => strtolower($validated['email']),
                'password' => \Illuminate\Support\Facades\Hash::make($validated['password']),
            ]);

            // Créer le profil
            \App\Models\Profile::create([
                'user_id' => $user->id,
                'full_name' => $validated['full_name'],
                'email' => strtolower($validated['email']),
                'phone' => $validated['phone'],
                'address' => $validated['address'],
                'city' => $validated['city'],
                'account_type' => 'btoc',
            ]);

            // Assigner le rôle client
            \App\Models\UserRole::create([
                'user_id' => $user->id,
                'role' => 'user',
            ]);

            // Créer le client CRM
            $crmClient = \App\Models\Client::create([
                'user_id' => $user->id,
                'full_name' => $validated['full_name'],
                'email' => strtolower($validated['email']),
                'phone' => $validated['phone'],
                'address' => $validated['address'],
                'city' => $validated['city'],
                'tags' => ['Particulier'],
            ]);
            $clientId = $crmClient->id;

            // Générer un token pour connecter l'utilisateur automatiquement après la commande
            $token = $user->createToken('auth_token')->plainTextToken;
        }

        // Tenter de trouver un client CRM existant si pas encore défini
        if (!$clientId) {
            $existingClient = null;
            if ($user) {
                $existingClient = \App\Models\Client::where('user_id', $user->id)->first();
            }
            if (!$existingClient && !empty($validated['email'])) {
                $existingClient = \App\Models\Client::where('email', strtolower($validated['email']))->first();
            }

            if ($existingClient) {
                $clientId = $existingClient->id;
                // Optionnel: mettre à jour les infos du client avec celles de la commande si besoin
            } else {
                // Créer un client invité dans le CRM
                $guestClient = \App\Models\Client::create([
                    'user_id' => $user?->id,
                    'full_name' => $validated['full_name'],
                    'email' => !empty($validated['email']) ? strtolower($validated['email']) : null,
                    'phone' => $validated['phone'],
                    'address' => $validated['address'],
                    'city' => $validated['city'],
                    'tags' => ['Invité'],
                ]);
                $clientId = $guestClient->id;
            }
        }

        $requiresSpecialDiscount = $this->hasNonStandardDimension(
            array_column($validated['items'], 'size_label')
        );

        $order = Order::create([
            'user_id' => $user?->id,
            'client_id' => $clientId,
            'order_number' => Compteur::generateNumber('commande'),
            'full_name' => $validated['full_name'],
            'email' => $validated['email'] ?? null,
            'phone' => $validated['phone'],
            'phone2' => $validated['phone2'] ?? null,
            'address' => $validated['address'],
            'city' => $validated['city'],
            'requires_special_discount' => $requiresSpecialDiscount,
            'latitude' => $validated['latitude'] ?? null,
            'longitude' => $validated['longitude'] ?? null,
            'notes' => $validated['notes'] ?? null,
            'gclid' => $validated['gclid'] ?? null,
            'gbraid' => $validated['gbraid'] ?? null,
            'wbraid' => $validated['wbraid'] ?? null,
            'ads_click_captured_at' => !empty($validated['ads_click_captured_at']) ? \Carbon\Carbon::parse($validated['ads_click_captured_at']) : null,
            'meta_fbclid' => $hasMetaClick ? $metaAttribution['fbclid'] : null,
            'meta_fbc' => $hasMetaClick ? ($metaAttribution['fbc'] ?? null) : null,
            'meta_fbp' => $hasMetaClick ? ($metaAttribution['fbp'] ?? null) : null,
            'meta_click_captured_at' => $hasMetaClick && !empty($metaAttribution['captured_at'])
                ? \Carbon\Carbon::parse($metaAttribution['captured_at'])
                : null,
            'meta_attribution_session' => $hasMetaClick
                ? hash('sha256', $request->session()->getId())
                : null,
            'meta_event_id' => $metaEventId,
            'meta_client_ip' => $hasMetaClick ? $request->ip() : null,
            'meta_client_user_agent' => $hasMetaClick ? $request->userAgent() : null,
            'meta_event_source_url' => $metaEventSourceUrl,
            'status' => 'en_attente',
        ]);

        if ($request->hasFile('payment_proof')) {
            $proofPath = $request->file('payment_proof')->store('order-payment-proofs', 'local');
            if (!$proofPath) {
                $order->delete();
                return $this->sendError('Could not store payment proof', [], 500);
            }

            if (!$order->update(['payment_proof_path' => $proofPath])) {
                Storage::disk('local')->delete($proofPath);
                $order->delete();
                return $this->sendError('Could not save payment proof', [], 500);
            }
        }

        $subtotal = 0;
        foreach ($validated['items'] as $item) {
            $itemTotal = $item['unit_price'] * $item['quantity'];
            $subtotal += $itemTotal;

            $order->items()->create([
                'product_id' => $item['product_id'],
                'product_name' => $item['product_name'],
                'size_label' => $item['size_label'],
                'unit_price' => $item['unit_price'],
                'quantity' => $item['quantity'],
                'total' => $itemTotal,
                'grammage' => $item['grammage'] ?? null,
            ]);
        }

        $order->update([
            'subtotal' => $subtotal,
            'total' => $subtotal,
        ]);

        // Mark matching prospects as converted
        try {
            $phone = $validated['phone'];
            $email = $validated['email'] ?? null;
            
            $prospectQuery = \App\Models\Prospect::where('status', '!=', 'converti');
            
            $prospectQuery->where(function($q) use ($phone, $email) {
                $q->where('phone', $phone);
                if ($email) {
                    $q->orWhere('email', $email);
                }
            });

            $prospectQuery->update(['status' => 'converti']);
        } catch (\Throwable $e) {
            // Silence prospect update errors
        }

        // Notify admin about the new order
        try {
            app(NotificationService::class)->notifyOrderCreated($order, false);
        } catch (\Throwable $e) {
            // Ne pas empêcher la création de la commande si la notification échoue
        }

        $responseData = [
            'order' => $order->load('items'),
            'meta_attributed' => $hasMetaClick,
        ];

        if ($token) {
            $responseData['token'] = $token;
            $responseData['user'] = [
                'id' => $user->id,
                'email' => $user->email,
                'name' => $user->name,
                'role' => 'Client',
                'account_type' => 'btoc',
                'profile' => $user->profile,
            ];
        }

        return $this->sendResponse($responseData, 'Order created successfully', 201);
    }

    public function metaPurchaseStatus(Request $request, Order $order): JsonResponse
    {
        $sessionHash = hash('sha256', $request->session()->getId());
        if (
            !$order->meta_attribution_session
            || !hash_equals($order->meta_attribution_session, $sessionHash)
        ) {
            return $this->sendError('Order not found', [], 404);
        }

        $ready = $order->status === 'accepté'
            && $order->meta_fbclid !== null
            && $order->meta_event_id !== null
            && $order->meta_purchase_queued_at !== null
            && (float) $order->total > 0;

        if (!$ready) {
            return $this->sendResponse(['ready' => false], 'Meta Purchase is not ready.');
        }

        return $this->sendResponse([
            'ready' => true,
            'event_id' => $order->meta_event_id,
            'order_id' => (string) $order->order_number,
            'value' => (float) $order->total,
            'currency' => 'TND',
            'items' => $order->items()->get(['product_id', 'product_name', 'unit_price', 'quantity'])
                ->map(fn ($item) => [
                    'id' => (string) $item->product_id,
                    'name' => $item->product_name,
                    'price' => (float) $item->unit_price,
                    'quantity' => (int) $item->quantity,
                ])
                ->values(),
        ], 'Meta Purchase is ready.');
    }

    public function latestId(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Order::class);

        $latest = Order::orderBy('created_at', 'desc')->first(['id', 'order_number', 'created_at']);
        
        return $this->sendResponse($latest, 'Latest order retrieved');
    }

    public function fromQuote(Quote $quote): JsonResponse
    {
        $this->authorize('create', Order::class);

        $quoteItems = $quote->items;
        $order = Order::create([
            'order_number' => Compteur::generateNumber('commande'),
            'client_id' => $quote->client_id,
            'full_name' => $quote->client_name ?? ($quote->client ? $quote->client->full_name : 'Client'),
            'phone' => $quote->client ? $quote->client->phone : '—',
            'address' => $quote->client ? $quote->client->address : '—',
            'city' => $quote->client ? $quote->client->city : '—',
            'status' => 'en_attente',
            'requires_special_discount' => $this->hasNonStandardDimension($quoteItems->pluck('dimension')),
            'subtotal' => $quote->total,
            'total' => $quote->total,
            'notes' => $quote->notes,
        ]);

        foreach ($quoteItems as $item) {
            $product = $item->product_slug ? Product::where('slug', $item->product_slug)->first() : null;
            
            $order->items()->create([
                'product_id' => $product ? $product->id : null,
                'product_name' => $item->description,
                'size_label' => $item->dimension ?: 'Standard',
                'unit_price' => $item->unit_price,
                'quantity' => $item->quantity,
                'total' => $item->total,
            ]);
        }

        // Notify admin that an order was created from a quote
        try {
            app(NotificationService::class)->notifyOrderCreated($order, false);
        } catch (\Throwable $e) {
            // Ignorer les erreurs de notification
        }

        // Marquer le devis comme accepté
        $quote->update(['status' => 'accepté']);

        return $this->sendResponse($order->load('items'), 'Order created from quote successfully', 201);
    }

    public function update(Request $request, Order $order): JsonResponse
    {
        $this->authorize('update', $order);

        $validated = $request->validate([
            'status' => 'string|in:en_attente,accepté,annulée',
            'full_name' => 'string|max:255',
            'phone' => 'string|max:20',
            'address' => 'string|max:255',
            'city' => 'string|max:100',
            'notes' => 'nullable|string',
        ]);

        if (($validated['status'] ?? null) === 'accepté') {
            $this->authorize('approve', $order);
        }

        $oldStatus = $order->status;
        $order->update($validated);

        // Lors du changement vers 'accepté', générer un BL si nécessaire (logique plus bas)

        // Si le statut change à 'accepté', générer un bon de livraison (une seule fois)
        if ($oldStatus !== 'accepté' && (($validated['status'] ?? null) === 'accepté')) {
            if (!$order->deliveryNotes()->exists()) {
                // Créer le bon de livraison à partir de la commande
                $clientId = null;
                if ($order->user_id && $order->user) {
                    $client = \App\Models\Client::where('email', $order->user->email)->first();
                    if ($client) $clientId = $client->id;
                }

                $note = \App\Models\DeliveryNote::create([
                    'delivery_number' => Compteur::generateNumber('bon_livraison'),
                    'order_id' => $order->id,
                    'client_id' => $clientId,
                    'status' => 'preparation',
                    'delivery_address' => $order->address,
                    'delivery_city' => $order->city,
                    'full_name' => $order->full_name,
                    'phone' => $order->phone,
                    'notes' => $order->notes,
                ]);

                foreach ($order->items as $item) {
                    $note->items()->create([
                        'product_id'       => $item->product_id,
                        'product_name'     => $item->product_name,
                        'size_label'       => $item->size_label,
                        'quantity'         => $item->quantity,
                        'delivered_quantity' => $item->quantity,
                        'grammage'         => $item->grammage,
                    ]);
                }
            }
            // nothing else to do for status here; order remains 'accepté'
        }

        if (($validated['status'] ?? null) === 'accepté') {
            $this->queueMetaPurchase($order);
        }

        return $this->sendResponse($order->load('invoice'), 'Order updated successfully');
    }

    private function queueMetaPurchase(Order $order): void
    {
        if (
            !$order->meta_fbclid
            || !$order->meta_event_id
            || (float) $order->total <= 0
            || $order->meta_purchase_queued_at
        ) {
            return;
        }

        if (empty(config('services.meta.access_token'))) {
            Log::error('Meta Purchase could not be queued because META_CAPI_ACCESS_TOKEN is not configured.', [
                'order_id' => $order->id,
                'event_id' => $order->meta_event_id,
            ]);
            return;
        }

        DB::transaction(function () use ($order): void {
            $lockedOrder = Order::with('items')->lockForUpdate()->findOrFail($order->id);
            if (
                $lockedOrder->status !== 'accepté'
                || !$lockedOrder->meta_fbclid
                || !$lockedOrder->meta_event_id
                || (float) $lockedOrder->total <= 0
                || $lockedOrder->meta_purchase_queued_at
            ) {
                return;
            }

            try {
                SendMetaCapiEventJob::dispatch(
                    'Purchase',
                    [
                        'email' => $lockedOrder->email,
                        'phone' => $lockedOrder->phone,
                        'full_name' => $lockedOrder->full_name,
                        'city' => $lockedOrder->city,
                        'fbp' => $lockedOrder->meta_fbp,
                        'fbc' => $lockedOrder->meta_fbc,
                        'client_ip_address' => $lockedOrder->meta_client_ip,
                        'client_user_agent' => $lockedOrder->meta_client_user_agent,
                    ],
                    [
                        'value' => (float) $lockedOrder->total,
                        'currency' => 'TND',
                        'content_type' => 'product',
                        'content_ids' => $lockedOrder->items
                            ->pluck('product_id')
                            ->map(fn ($id) => (string) $id)
                            ->values()
                            ->all(),
                        'num_items' => (int) $lockedOrder->items->sum('quantity'),
                        'order_id' => (string) $lockedOrder->order_number,
                    ],
                    $lockedOrder->meta_event_id,
                    $lockedOrder->meta_event_source_url,
                )->afterCommit();

                $lockedOrder->meta_purchase_queued_at = now();
                $lockedOrder->save();
            } catch (\Throwable $exception) {
                Log::error('Meta Purchase dispatch failed; it can be retried by approving the order again.', [
                    'order_id' => $lockedOrder->id,
                    'event_id' => $lockedOrder->meta_event_id,
                    'exception' => $exception->getMessage(),
                ]);
                throw $exception;
            }
        });
    }

    public function showPaymentProof(Order $order): BinaryFileResponse
    {
        $this->authorize('managePaymentProof', $order);

        abort_unless(
            $order->payment_proof_path && Storage::disk('local')->exists($order->payment_proof_path),
            404,
            'Payment proof not found'
        );

        $path = Storage::disk('local')->path($order->payment_proof_path);
        $mimeType = Storage::disk('local')->mimeType($order->payment_proof_path) ?: 'application/octet-stream';

        return response()->file($path, [
            'Content-Type' => $mimeType,
            'Cache-Control' => 'private, no-store',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    public function storePaymentProof(Request $request, Order $order): JsonResponse
    {
        $this->authorize('managePaymentProof', $order);

        $validated = $request->validate([
            'payment_proof' => 'required|file|mimes:pdf,jpg,jpeg,png,webp|max:10240',
        ]);

        $newPath = $validated['payment_proof']->store('order-payment-proofs', 'local');
        if (!$newPath) {
            return $this->sendError('Could not store payment proof', [], 500);
        }

        $oldPath = $order->payment_proof_path;
        $order->payment_proof_path = $newPath;
        if (!$order->save()) {
            Storage::disk('local')->delete($newPath);
            return $this->sendError('Could not save payment proof', [], 500);
        }

        if ($oldPath) {
            Storage::disk('local')->delete($oldPath);
        }

        return $this->sendResponse(['has_payment_proof' => true], 'Payment proof uploaded successfully');
    }

    public function destroy(Order $order): JsonResponse
    {
        $this->authorize('delete', $order);

        $order->items()->delete();
        if ($order->payment_proof_path) {
            Storage::disk('local')->delete($order->payment_proof_path);
        }
        $order->delete();

        return $this->sendResponse(null, 'Order deleted successfully');
    }

    /**
     * Update an individual order item's price and recalculate order totals.
     */
    public function updateItem(Request $request, Order $order, \App\Models\OrderItem $item): JsonResponse
    {
        $this->authorize('update', $order);

        $validated = $request->validate([
            'unit_price' => 'required|numeric|min:0',
        ]);

        // Update item price and total
        $item->update([
            'unit_price' => $validated['unit_price'],
            'total' => $validated['unit_price'] * $item->quantity,
        ]);

        // Recalculate order subtotal and total
        $newSubtotal = $order->items()->sum('total');
        $order->update([
            'subtotal' => $newSubtotal,
            'total' => $newSubtotal,
        ]);

        return $this->sendResponse($item, 'Order item updated successfully');
    }

    /**
     * Public method to allow guests to update BL contact info for an order.
     */
    public function updateBlContact(Request $request, Order $order): JsonResponse
    {
        $validated = $request->validate([
            'bl_contact' => 'required|string|max:255',
        ]);

        $order->update([
            'bl_contact' => $validated['bl_contact']
        ]);

        return $this->sendResponse($order, 'BL contact updated successfully');
    }
}
