<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\ProductSizeController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\BlogPostController;
use App\Http\Controllers\Api\ShowroomController;
use App\Http\Controllers\Api\HeroSlideController;
use App\Http\Controllers\Api\GammeController;
use App\Http\Controllers\Api\ClientController;
use App\Http\Controllers\Api\InvoiceController;
use App\Http\Controllers\Api\QuoteController;
use App\Http\Controllers\Api\DeliveryNoteController;
use App\Http\Controllers\Api\TreasuryEntryController;
use App\Http\Controllers\Api\UploadController;
use App\Http\Controllers\Api\DimensionController;
use App\Http\Controllers\Api\FileController;
use App\Http\Controllers\Api\CategorieController;
use App\Http\Controllers\Api\FermeteController;
use App\Http\Controllers\Api\FreeGiftController;
use App\Http\Controllers\Api\DocumentController;
use App\Http\Controllers\Api\IconController;
use App\Http\Controllers\Api\SocialNetworkController;
use App\Http\Controllers\Api\ReviewController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\NewsletterController;

// Public routes (no authentication required)
Route::middleware('api')->group(function () {
    // Authentication - with rate limiting
    Route::middleware('throttle:60,1')->group(function () {
        Route::post('/auth/register', [AuthController::class, 'register']);
        Route::post('/auth/login', [AuthController::class, 'login']);
    });

    // CSRF Token
    Route::get('/csrf-token', [AuthController::class, 'getCsrfToken']);

    // DEBUG - Vérifier l'état des notifications (à supprimer après test)
    Route::get('/admin/notifications/debug/info', function () {
        $all = \App\Models\Notification::count();
        $admin = \App\Models\Notification::forAdmin()->count();
        $withUserId = \App\Models\Notification::whereNotNull('user_id')->count();
        return response()->json([
            'total' => $all,
            'admin' => $admin,
            'with_user_id' => $withUserId,
            'first_5' => \App\Models\Notification::limit(5)->get()->map(fn($n) => [
                'id' => $n->id,
                'type' => $n->type,
                'user_id' => $n->user_id,
                'status' => $n->status,
                'color' => $n->color
            ])->toArray()
        ]);
    });

    // Products
    Route::get('/products', [ProductController::class, 'index']);
    Route::get('/products/{product}', [ProductController::class, 'show']);
    Route::get('/products/{product}/sizes', [ProductSizeController::class, 'index']);

    // Blog posts (public - only published)
    Route::get('/blog-posts', [BlogPostController::class, 'index']);
    Route::get('/blog-posts/{post:slug}', [BlogPostController::class, 'show']);

    // Showrooms
    Route::get('/showrooms', [ShowroomController::class, 'index']);
    Route::get('/showrooms/{showroom}', [ShowroomController::class, 'show']);

    // Hero slides
    Route::get('/hero-slides', [HeroSlideController::class, 'index']);
    Route::get('/hero-slides/{slide}', [HeroSlideController::class, 'show']);

    // Gammes
    Route::get('/gammes', [GammeController::class, 'index']);
    Route::get('/gammes/{gamme}', [GammeController::class, 'show']);

    // Categories
    Route::get('/categories', [CategorieController::class, 'index']);
    Route::get('/categories/{categorie}', [CategorieController::class, 'show']);

    // Fermetes
    Route::get('/fermetes', [FermeteController::class, 'index']);
    Route::get('/fermetes/{fermete}', [FermeteController::class, 'show']);

    // Dimensions (public read)
    Route::get('/dimensions', [DimensionController::class, 'index']);

    // Free gifts (public read)
    Route::get('/free-gifts', [FreeGiftController::class, 'index']);

    // Settings (public read)
    Route::get('/settings', [\App\Http\Controllers\Api\SettingController::class, 'index']);

    // Social Networks & Icons
    Route::get('/social-networks', [SocialNetworkController::class, 'index']);
    Route::get('/icons', [IconController::class, 'index']);

    // Orders checkout (Public)
    Route::post('/orders', [OrderController::class, 'store']);

    // Reviews & Contact Messages
    Route::get('/published-reviews', [ReviewController::class, 'published']);
    Route::post('/reviews', [ReviewController::class, 'store']);

    // About sections
    Route::get('/about-sections', [\App\Http\Controllers\Api\AboutSectionController::class, 'index']);

    // Newsletter (Public)
    Route::post('/newsletters', [NewsletterController::class, 'store']);

    // Public file access (with proper MIME type validation)
    Route::get('/files/{path}', [FileController::class, 'serve'])
        ->where('path', '.*')
        ->name('files.serve');
});

// Protected routes (authentication required)
Route::middleware('auth:sanctum')->group(function () {
    // Authentication
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/user', [AuthController::class, 'getUser']);
    Route::get('/user/profile', [AuthController::class, 'getProfile']);
    Route::put('/user/profile', [AuthController::class, 'updateProfile']);
    Route::get('/user/orders', [OrderController::class, 'myOrders']);

    // File uploads - Admin only
    Route::post('/upload', [UploadController::class, 'store']);

    Route::get('/user', function (Request $request) {
        return $request->user();
    });

    // Products - Admin only
    Route::post('/products', [ProductController::class, 'store']);
    Route::post('/products/{product}', [ProductController::class, 'update']); // POST pour multipart
    Route::put('/products/{product}', [ProductController::class, 'update']);
    Route::delete('/products/{product}', [ProductController::class, 'destroy']);

    // Product sizes
    Route::post('/products/{product}/sizes', [ProductSizeController::class, 'store']);
    Route::put('/products/{product}/sizes/{size}', [ProductSizeController::class, 'update']);
    Route::delete('/products/{product}/sizes/{size}', [ProductSizeController::class, 'destroy']);

    // Product free gifts
    Route::put('/products/{product}/free-gifts', [ProductController::class, 'syncFreeGifts']);

    // Orders
    Route::get('/orders', [OrderController::class, 'index']);
    Route::get('/orders/{order}', [OrderController::class, 'show']);
    Route::get('/orders/{order}/items', [OrderController::class, 'items']);
    Route::put('/orders/{order}', [OrderController::class, 'update']);
    Route::delete('/orders/{order}', [OrderController::class, 'destroy']);

    // Admin Orders - Route spécifique pour afficher TOUTES les commandes
    Route::get('/orders/next-number', [OrderController::class, 'nextNumber']);
    Route::get('/admin/orders', [OrderController::class, 'adminIndex']);
    Route::get('/admin/orders/latest-id', [OrderController::class, 'latestId']);

    // Blog posts - Admin only
    Route::post('/blog-posts', [BlogPostController::class, 'store']);
    Route::post('/blog-posts/{post}', [BlogPostController::class, 'update']); // POST pour multipart
    Route::put('/blog-posts/{post}', [BlogPostController::class, 'update']);
    Route::delete('/blog-posts/{post}', [BlogPostController::class, 'destroy']);

    // Showrooms - Admin only
    Route::post('/showrooms', [ShowroomController::class, 'store']);
    Route::post('/showrooms/{showroom}', [ShowroomController::class, 'update']); // POST pour multipart
    Route::put('/showrooms/{showroom}', [ShowroomController::class, 'update']);
    Route::delete('/showrooms/{showroom}', [ShowroomController::class, 'destroy']);

    // Hero slides - Admin only
    Route::post('/hero-slides', [HeroSlideController::class, 'store']);
    Route::post('/hero-slides/{slide}', [HeroSlideController::class, 'update']); // POST pour multipart
    Route::put('/hero-slides/{slide}', [HeroSlideController::class, 'update']);
    Route::delete('/hero-slides/{slide}', [HeroSlideController::class, 'destroy']);

    // Gammes - Admin only
    Route::post('/gammes', [GammeController::class, 'store']);
    Route::post('/gammes/reorder', [GammeController::class, 'reorder']);
    Route::post('/gammes/{gamme}', [GammeController::class, 'update']); // POST pour multipart
    Route::put('/gammes/{gamme}', [GammeController::class, 'update']);
    Route::delete('/gammes/{gamme}', [GammeController::class, 'destroy']);

    // Clients - Admin only
    Route::get('/clients', [ClientController::class, 'index']);
    Route::get('/clients/{client}', [ClientController::class, 'show']);
    Route::get('/clients/{client}/quotes', [ClientController::class, 'quotes']);
    Route::get('/clients/{client}/invoices', [ClientController::class, 'invoices']);
    Route::get('/clients/{client}/orders', [ClientController::class, 'orders']);
    Route::get('/clients/{client}/reviews', [ClientController::class, 'reviews']);
    Route::post('/clients', [ClientController::class, 'store']);
    Route::put('/clients/{client}', [ClientController::class, 'update']);
    Route::delete('/clients/{client}', [ClientController::class, 'destroy']);

    // Invoices - Admin only
    Route::get('/invoices/next-number', [InvoiceController::class, 'nextNumber']);
    Route::get('/invoices', [InvoiceController::class, 'index']);
    Route::get('/invoices/{invoice}', [InvoiceController::class, 'show']);
    Route::post('/invoices', [InvoiceController::class, 'store']);
    Route::put('/invoices/{invoice}', [InvoiceController::class, 'update']);
    Route::delete('/invoices/{invoice}', [InvoiceController::class, 'destroy']);
    Route::post('/quotes/{quote}/to-invoice', [InvoiceController::class, 'fromQuote']);

    // Quotes - Admin only
    Route::get('/quotes/next-number', [QuoteController::class, 'nextNumber']);
    Route::get('/quotes', [QuoteController::class, 'index']);
    Route::get('/quotes/{quote}', [QuoteController::class, 'show']);
    Route::get('/quotes/{quote}/items', [QuoteController::class, 'items']);
    Route::post('/quotes', [QuoteController::class, 'store']);
    Route::put('/quotes/{quote}', [QuoteController::class, 'update']);
    Route::delete('/quotes/{quote}', [QuoteController::class, 'destroy']);
    Route::post('/quotes/{quote}/to-order', [OrderController::class, 'fromQuote']);

    // Delivery notes - Admin only
    Route::get('/delivery-notes/next-number', [DeliveryNoteController::class, 'nextNumber']);
    Route::get('/delivery-notes', [DeliveryNoteController::class, 'index']);
    Route::get('/delivery-notes/{note}', [DeliveryNoteController::class, 'show']);
    Route::get('/delivery-notes/{note}/items', [DeliveryNoteController::class, 'items']);
    Route::post('/delivery-notes', [DeliveryNoteController::class, 'store']);
    Route::put('/delivery-notes/{note}', [DeliveryNoteController::class, 'update']);
    Route::put('/delivery-notes/{note}/status', [DeliveryNoteController::class, 'updateStatus']);
    Route::put('/delivery-note-items/{item}', [DeliveryNoteController::class, 'updateItem']);
    Route::delete('/delivery-notes/{note}', [DeliveryNoteController::class, 'destroy']);

    // Delivery Men API
    Route::apiResource('/delivery-men', \App\Http\Controllers\Api\DeliveryManController::class);

    // Social Networks Management
    Route::post('/social-networks', [SocialNetworkController::class, 'store']);
    Route::put('/social-networks/{id}', [SocialNetworkController::class, 'update']);
    Route::delete('/social-networks/{id}', [SocialNetworkController::class, 'destroy']);

    // About Sections Management
    Route::post('/about-sections', [\App\Http\Controllers\Api\AboutSectionController::class, 'store']);
    Route::post('/about-sections/reorder', [\App\Http\Controllers\Api\AboutSectionController::class, 'reorder']);
    Route::post('/about-sections/{aboutSection}', [\App\Http\Controllers\Api\AboutSectionController::class, 'update']);
    Route::put('/about-sections/{aboutSection}', [\App\Http\Controllers\Api\AboutSectionController::class, 'update']);
    Route::delete('/about-sections/{aboutSection}', [\App\Http\Controllers\Api\AboutSectionController::class, 'destroy']);

    // Reviews & Contact Messages Management
    Route::get('/reviews', [ReviewController::class, 'index']);
    Route::put('/reviews/{id}/publish', [ReviewController::class, 'togglePublish']);
    Route::delete('/reviews/{id}', [ReviewController::class, 'destroy']);

    // Settings API
    Route::post('/settings', [\App\Http\Controllers\Api\SettingController::class, 'store']);

    // Treasury entries - Admin only
    Route::get('/treasury-entries', [TreasuryEntryController::class, 'index']);
    Route::post('/treasury-entries', [TreasuryEntryController::class, 'store']);
    Route::put('/treasury-entries/{entry}', [TreasuryEntryController::class, 'update']);
    Route::delete('/treasury-entries/{entry}', [TreasuryEntryController::class, 'destroy']);
    Route::get('/treasury-entries/summary', [TreasuryEntryController::class, 'summary']);

    // Dimensions - Admin only (write)
    Route::post('/dimensions', [DimensionController::class, 'store']);
    Route::post('/dimensions/reorder', [DimensionController::class, 'reorder']);
    Route::put('/dimensions/{dimension}', [DimensionController::class, 'update']);
    Route::delete('/dimensions/{dimension}', [DimensionController::class, 'destroy']);

    // Categories - Admin only
    Route::post('/categories', [CategorieController::class, 'store']);
    Route::put('/categories/{categorie}', [CategorieController::class, 'update']);
    Route::delete('/categories/{categorie}', [CategorieController::class, 'destroy']);

    // Fermetes - Admin only
    Route::post('/fermetes', [FermeteController::class, 'store']);
    Route::put('/fermetes/{fermete}', [FermeteController::class, 'update']);
    Route::delete('/fermetes/{fermete}', [FermeteController::class, 'destroy']);

    // Free Gifts - Admin only
    Route::get('/free-gifts', [FreeGiftController::class, 'index']);
    Route::post('/free-gifts', [FreeGiftController::class, 'store']);
    Route::post('/free-gifts/{freeGift}', [FreeGiftController::class, 'update']); // POST pour multipart
    Route::put('/free-gifts/{freeGift}', [FreeGiftController::class, 'update']);
    Route::get('/free-gifts/{freeGift}', [FreeGiftController::class, 'show']);
    Route::delete('/free-gifts/{freeGift}', [FreeGiftController::class, 'destroy']);
    Route::get('/products/{product}/free-gifts', [FreeGiftController::class, 'productGifts']);

    // Extra conversion routes
    Route::post('/orders/{order}/to-invoice', [InvoiceController::class, 'fromOrder']);
    Route::post('/orders/{order}/to-delivery-note', [DeliveryNoteController::class, 'fromOrder']);

    // Protected file access (authenticated users)
    Route::get('/files/protected/{path}', [FileController::class, 'serve'])
        ->where('path', '.*')
        ->name('files.protected');

    // Document PDFs - Admin only
    Route::get('/invoices/{invoice}/pdf', [DocumentController::class, 'downloadInvoicePDF']);
    Route::get('/invoices/{invoice}/preview', [DocumentController::class, 'previewInvoicePDF']);
    Route::get('/delivery-notes/{note}/pdf', [DocumentController::class, 'downloadDeliveryNotePDF']);
    Route::get('/delivery-notes/{note}/preview', [DocumentController::class, 'previewDeliveryNotePDF']);

    // Compteurs Management
    Route::get('/compteurs', [\App\Http\Controllers\Api\CompteurController::class, 'index']);
    Route::put('/compteurs/{id}', [\App\Http\Controllers\Api\CompteurController::class, 'update']);

    // Notifications Management
    Route::prefix('/admin/notifications')->group(function () {
        Route::get('/', [NotificationController::class, 'adminIndex']);
        Route::post('/', [NotificationController::class, 'store']);
        Route::get('/stats', [NotificationController::class, 'getStats']);
        Route::post('/mark-all-read', [NotificationController::class, 'markAllAdminAsRead']);
        Route::post('/clean-all', [NotificationController::class, 'cleanAllAdmin']);
        Route::post('/clean-expired', [NotificationController::class, 'cleanExpired']);
    });

    Route::prefix('/notifications')->group(function () {
        Route::get('/', [NotificationController::class, 'clientIndex']);
        Route::post('/mark-all-read', [NotificationController::class, 'markAllClientAsRead']);
    });

    Route::prefix('/notifications/{notification}')->group(function () {
        Route::get('/', [NotificationController::class, 'show']);
        Route::post('/read', [NotificationController::class, 'markAsRead']);
        Route::delete('/', [NotificationController::class, 'destroy']);
    });

    // Newsletter (Admin)
    Route::get('/newsletters', [NewsletterController::class, 'index']);
    Route::get('/newsletters/export', [NewsletterController::class, 'export']);
    Route::delete('/newsletters/{id}', [NewsletterController::class, 'destroy']);

    // Get signed temporary URLs for files (1 hour validity)
    Route::post('/files/signed-url', [FileController::class, 'getSignedUrl']);
});
