<?php

namespace App\Http\Controllers\Api;

use App\Models\Order;
use App\Models\Invoice;
use App\Models\Compteur;
use App\Models\Quote;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use App\Services\NotificationService;

class OrderController extends BaseController
{
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

        $orders = $query->with(['items', 'invoice', 'user.profile'])->orderBy('created_at', 'desc')->paginate($request->get('per_page', 15));

        return $this->sendResponse($orders, 'Orders retrieved successfully');
    }

    /**
     * Admin route: Retourne TOUTES les commandes sans filtrage utilisateur
     */
    public function adminIndex(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Order::class);

        $query = Order::query();

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $orders = $query->with(['items', 'invoice', 'user.profile'])->orderBy('created_at', 'desc')->paginate($request->get('per_page', 15));

        return $this->sendResponse($orders, 'All orders retrieved successfully');
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

        $order->load('items', 'invoice', 'quote');

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
            'create_account' => 'boolean',
            'password' => 'required_if:create_account,true|nullable|string|min:8',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|uuid|exists:products,id',
            'items.*.product_name' => 'required|string',
            'items.*.size_label' => 'required|string',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.grammage' => 'nullable|string',
        ]);

        $user = Auth::guard('sanctum')->user();
        $token = null;
        $clientId = null;

        // Si l'utilisateur n'est pas connecté et veut créer un compte
        if (!$user && ($request->create_account === true || $request->create_account === 1)) {
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
            'latitude' => $validated['latitude'] ?? null,
            'longitude' => $validated['longitude'] ?? null,
            'notes' => $validated['notes'] ?? null,
            'status' => 'en_attente',
        ]);

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

        // Notify admin about the new order
        try {
            app(NotificationService::class)->notifyOrderCreated($order, false);
        } catch (\Throwable $e) {
            // Ne pas empêcher la création de la commande si la notification échoue
        }

        $responseData = [
            'order' => $order->load('items'),
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

    public function latestId(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Order::class);

        $latest = Order::orderBy('created_at', 'desc')->first(['id', 'order_number', 'created_at']);
        
        return $this->sendResponse($latest, 'Latest order retrieved');
    }

    public function fromQuote(Quote $quote): JsonResponse
    {
        $this->authorize('create', Order::class);

        $order = Order::create([
            'order_number' => Compteur::generateNumber('commande'),
            'client_id' => $quote->client_id,
            'full_name' => $quote->client_name ?? ($quote->client ? $quote->client->full_name : 'Client'),
            'phone' => $quote->client ? $quote->client->phone : '—',
            'address' => $quote->client ? $quote->client->address : '—',
            'city' => $quote->client ? $quote->client->city : '—',
            'status' => 'en_attente',
            'subtotal' => $quote->total,
            'total' => $quote->total,
            'notes' => 'Générée depuis le devis #' . $quote->quote_number . ($quote->notes ? "\n\n" . $quote->notes : ''),
        ]);

        foreach ($quote->items as $item) {
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

        $oldStatus = $order->status;
        $order->update($validated);

        // Lors du changement vers 'accepté', générer un BL si nécessaire (logique plus bas)

        // Si le statut change à 'accepté', générer un bon de livraison (une seule fois)
        if ($oldStatus !== 'accepté' && ($validated['status'] === 'accepté')) {
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

        return $this->sendResponse($order->load('invoice'), 'Order updated successfully');
    }

    public function destroy(Order $order): JsonResponse
    {
        $this->authorize('delete', $order);

        $order->items()->delete();
        $order->delete();

        return $this->sendResponse(null, 'Order deleted successfully');
    }
}
