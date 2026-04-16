<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\UserRole;
use App\Models\Product;
use App\Models\ProductSize;
use App\Models\BlogPost;
use App\Models\Showroom;
use App\Models\HeroSlide;
use App\Models\Gamme;
use App\Models\SiteContent;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Create admin user
        $admin = User::factory()->create([
            'name' => 'Admin',
            'email' => 'admin@supersiesta.com',
        ]);

        UserRole::create([
            'user_id' => $admin->id,
            'role' => 'admin',
        ]);

        // Create test user
        $user = User::factory()->create([
            'name' => 'Test User',
            'email' => 'test@example.com',
        ]);

        UserRole::create([
            'user_id' => $user->id,
            'role' => 'user',
        ]);

        // Create Gammes
        $gammes = [
            [
                'name' => 'Relax+',
                'slug' => 'relax-plus',
                'description' => 'Notre gamme Relax+ offre le confort ultime avec un soutien orthopédique optimal.',
                'video_url' => '/videos/relax.mp4',
                'sort_order' => 1,
            ],
            [
                'name' => 'Tendresse+',
                'slug' => 'tendresse-plus',
                'description' => 'Découvrez la douceur et le confort de notre gamme Tendresse+.',
                'video_url' => '/videos/tendress.mp4',
                'sort_order' => 2,
            ],
        ];

        foreach ($gammes as $gamme) {
            Gamme::create($gamme);
        }

        // Create Products
        $products = [
            [
                'name' => 'Matelas Top Relax',
                'slug' => 'matelas-top-relax',
                'categorie' => 'orthopédique',
                'fermete' => 'ferme',
                'gamme' => 'Relax+',
                'image' => '/images/TopRelax-1.jpg',
                'description' => 'Matelas haut de gamme avec soutien orthopédique premium',
                'badge' => 'Bestseller',
                'in_promo' => true,
            ],
            [
                'name' => 'Matelas Tendresse',
                'slug' => 'matelas-tendresse',
                'categorie' => 'orthopédique',
                'fermete' => 'moyen',
                'gamme' => 'Tendresse+',
                'image' => '/images/tendresse.jpg',
                'description' => 'Matelas doux et confortable pour un sommeil réparateur',
                'badge' => null,
                'in_promo' => false,
            ],
        ];

        foreach ($products as $product) {
            $createdProduct = Product::create($product);

            // Create sizes for each product
            $sizes = [
                ['label' => '90x190', 'price' => 299.99, 'reseller_price' => 249.99],
                ['label' => '140x190', 'price' => 499.99, 'reseller_price' => 399.99],
                ['label' => '160x200', 'price' => 599.99, 'reseller_price' => 499.99],
            ];

            foreach ($sizes as $size) {
                $createdProduct->sizes()->create($size);
            }
        }

        // Create Showrooms
        $showrooms = [
            [
                'name' => 'Super Siesta Tunis Centre',
                'address' => '15 Avenue Habib Bourguiba',
                'city' => 'Tunis',
                'phone' => '+216 71 000 001',
                'opening_hours' => 'Lun-Sam 9h-19h',
                'sort_order' => 1,
            ],
            [
                'name' => 'Super Siesta La Marsa',
                'address' => '22 Rue du Lac',
                'city' => 'La Marsa',
                'phone' => '+216 71 000 002',
                'opening_hours' => 'Lun-Sam 9h-19h',
                'sort_order' => 2,
            ],
            [
                'name' => 'Super Siesta Sousse',
                'address' => '8 Boulevard 14 Janvier',
                'city' => 'Sousse',
                'phone' => '+216 73 000 003',
                'opening_hours' => 'Lun-Sam 9h-19h',
                'sort_order' => 3,
            ],
        ];

        foreach ($showrooms as $showroom) {
            Showroom::create($showroom);
        }

        // Create Hero Slides
        $slides = [
            [
                'title' => 'Super Siesta Officiel',
                'subtitle' => 'Sommeil Plaisir, Sommeil Hygiène. Découvrez notre collection de matelas premium fabriqués en Tunisie.',
                'cta_text' => 'Voir nos produits',
                'cta_link' => '/boutique',
                'image_url' => '/images/tendresse.jpg',
                'sort_order' => 0,
                'active' => true,
            ],
            [
                'title' => 'Jusqu\'à -20% sur les top modèles',
                'subtitle' => 'Profitez de nos meilleures offres sur les matelas Top Relax et Tendresse.',
                'cta_text' => 'Profiter de l\'offre',
                'cta_link' => '/boutique',
                'image_url' => '/images/TopRelax-1.jpg',
                'sort_order' => 1,
                'active' => true,
            ],
        ];

        foreach ($slides as $slide) {
            HeroSlide::create($slide);
        }

        // Create Blog Posts
        $posts = [
            [
                'title' => 'Comment choisir son matelas : le guide complet',
                'slug' => 'guide-choisir-matelas',
                'excerpt' => 'Découvrez nos conseils pour choisir le matelas idéal selon votre morphologie.',
                'content' => '## Comment choisir son matelas\n\nLe choix d\'un matelas est crucial...',
                'category' => 'conseil',
                'tags' => ['guide', 'matelas', 'sommeil'],
                'published' => true,
                'published_at' => now(),
            ],
            [
                'title' => 'Les bienfaits du sommeil orthopédique',
                'slug' => 'bienfaits-sommeil-orthopedique',
                'excerpt' => 'Un matelas orthopédique peut transformer votre qualité de sommeil.',
                'content' => '## Sommeil orthopédique\n\nUn bon soutien dorsal est essentiel...',
                'category' => 'conseil',
                'tags' => ['orthopédique', 'santé'],
                'published' => true,
                'published_at' => now(),
            ],
        ];

        foreach ($posts as $post) {
            BlogPost::create($post);
        }

        // Create Site Content
        $content = [
            [
                'key' => 'home_hero_text',
                'title' => 'Bienvenue chez Super Siesta',
                'content' => 'Découvrez notre collection de matelas premium',
                'page' => 'home',
                'section' => 'hero',
            ],
            [
                'key' => 'about_us_text',
                'title' => 'À propos de nous',
                'content' => 'Super Siesta est leader en matelas en Tunisie depuis 25 ans.',
                'page' => 'about',
            ],
        ];

        foreach ($content as $item) {
            SiteContent::create($item);
        }
    }
}
