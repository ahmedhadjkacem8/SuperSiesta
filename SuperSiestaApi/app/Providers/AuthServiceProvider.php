<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Gate;
use App\Models\Product;
use App\Models\Order;
use App\Models\BlogPost;
use App\Models\Client;
use App\Models\Invoice;
use App\Models\Quote;
use App\Models\DeliveryNote;
use App\Models\TreasuryEntry;
use App\Models\ProductSize;
use App\Models\Showroom;
use App\Models\HeroSlide;
use App\Models\Gamme;
use App\Models\Categorie;
use App\Models\Fermete;
use App\Policies\ProductPolicy;
use App\Policies\OrderPolicy;
use App\Policies\BlogPostPolicy;
use App\Policies\ClientPolicy;
use App\Policies\InvoicePolicy;
use App\Policies\QuotePolicy;
use App\Policies\DeliveryNotePolicy;
use App\Policies\TreasuryEntryPolicy;
use App\Policies\ProductSizePolicy;
use App\Policies\ShowroomPolicy;
use App\Policies\HeroSlidePolicy;
use App\Policies\GammePolicy;
use App\Policies\CategoriePolicy;
use App\Policies\FermetePolicy;

class AuthServiceProvider extends ServiceProvider
{
    /**
     * The model to policy mappings for the application.
     *
     * @var array<class-string, class-string>
     */
    protected $policies = [
        Product::class      => ProductPolicy::class,
        Order::class        => OrderPolicy::class,
        BlogPost::class     => BlogPostPolicy::class,
        Client::class       => ClientPolicy::class,
        Invoice::class      => InvoicePolicy::class,
        Quote::class        => QuotePolicy::class,
        DeliveryNote::class => DeliveryNotePolicy::class,
        TreasuryEntry::class => TreasuryEntryPolicy::class,
        ProductSize::class  => ProductSizePolicy::class,
        Showroom::class     => ShowroomPolicy::class,
        HeroSlide::class    => HeroSlidePolicy::class,
        Gamme::class        => GammePolicy::class,
        Categorie::class    => CategoriePolicy::class,
        Fermete::class      => FermetePolicy::class,
    ];

    /**
     * Register any authentication / authorization services.
     */
    public function boot(): void
    {
        $this->registerPolicies();
    }
}
