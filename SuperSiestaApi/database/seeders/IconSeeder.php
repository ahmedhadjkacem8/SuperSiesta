<?php

namespace Database\Seeders;

use App\Models\Icon;
use Illuminate\Database\Seeder;

class IconSeeder extends Seeder
{
    public function run(): void
    {
        $icons = [
            ['name' => 'Facebook', 'lucide_name' => 'Facebook', 'hex_color' => '#1877F2'],
            ['name' => 'Instagram', 'lucide_name' => 'Instagram', 'hex_color' => '#E4405F'],
            ['name' => 'X (ex-Twitter)', 'lucide_name' => 'Twitter', 'hex_color' => '#000000'],
            ['name' => 'LinkedIn', 'lucide_name' => 'Linkedin', 'hex_color' => '#0A66C2'],
            ['name' => 'WhatsApp', 'lucide_name' => 'Phone', 'hex_color' => '#25D366'],
            ['name' => 'YouTube', 'lucide_name' => 'Youtube', 'hex_color' => '#FF0000'],
            ['name' => 'TikTok', 'lucide_name' => 'Music', 'hex_color' => '#000000'],
            ['name' => 'Pinterest', 'lucide_name' => 'Pin', 'hex_color' => '#BD081C'],
            ['name' => 'Globe', 'lucide_name' => 'Globe', 'hex_color' => '#666666'],
        ];

        foreach ($icons as $icon) {
            Icon::updateOrCreate(['name' => $icon['name']], $icon);
        }
    }
}
