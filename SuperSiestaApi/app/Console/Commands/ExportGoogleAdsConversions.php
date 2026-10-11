<?php

namespace App\Console\Commands;

use App\Models\Order;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

class ExportGoogleAdsConversions extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'ads:export-conversions
                            {--since= : Exporter les commandes créées depuis cette date (format YYYY-MM-DD)}
                            {--all : Exporter toutes les commandes éligibles, même déjà marquées comme exportées}
                            {--dry-run : Aperçu sans générer de fichier ni marquer les commandes comme exportées}
                            {--status=* : Filtrer par statut(s) spécifique(s) (par défaut: statuts configurés)}
                            {--output= : Chemin personnalisé du fichier CSV de sortie}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Exporte les conversions Google Ads hors ligne (Offline Conversions) au format CSV standard pour import';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('🔍 Recherche des commandes éligibles pour l\'export Google Ads...');

        $conversionName = config('services.google_ads.offline_conversion_name', 'Purchase');
        $currency = config('services.google_ads.conversion_currency', 'TND');
        $timezone = config('services.google_ads.timezone', '+0100');

        $eligibleStatuses = $this->option('status');
        if (empty($eligibleStatuses)) {
            $eligibleStatuses = config('services.google_ads.eligible_statuses', ['accepté', 'accepte', 'livré', 'livre', 'en_attente']);
        }

        // Requête de sélection des commandes avec Click ID Google
        $query = Order::query()
            ->where(function ($q) {
                $q->where(function ($sub) {
                    $sub->whereNotNull('gclid')->where('gclid', '!=', '');
                })
                ->orWhere(function ($sub) {
                    $sub->whereNotNull('gbraid')->where('gbraid', '!=', '');
                })
                ->orWhere(function ($sub) {
                    $sub->whereNotNull('wbraid')->where('wbraid', '!=', '');
                });
            })
            ->whereIn('status', $eligibleStatuses);

        // Filtre non-exporté par défaut
        if (!$this->option('all')) {
            $query->whereNull('ads_exported_at');
        }

        // Filtre date début
        if ($since = $this->option('since')) {
            try {
                $sinceDate = Carbon::parse($since)->startOfDay();
                $query->where('created_at', '>=', $sinceDate);
                $this->comment("📅 Filtre actif : depuis {$sinceDate->toDateTimeString()}");
            } catch (\Throwable $e) {
                $this->error("Format de date invalide pour --since. Utilisez YYYY-MM-DD.");
                return self::FAILURE;
            }
        }

        $orders = $query->orderBy('created_at', 'asc')->get();

        if ($orders->isEmpty()) {
            $this->warn('ℹ️ Aucune nouvelle commande avec Click ID Google éligible trouvée.');
            return self::SUCCESS;
        }

        $this->info("✅ {$orders->count()} commande(s) éligible(s) trouvée(s).");

        $rows = [];
        $tableData = [];

        foreach ($orders as $order) {
            // Conversion Time format: yyyy-MM-dd HH:mm:ss+ZZ:ZZ (ex: 2026-10-09 18:30:00+0100)
            $conversionTime = $order->created_at ? $order->created_at->format('Y-m-d H:i:s') . $timezone : now()->format('Y-m-d H:i:s') . $timezone;
            $value = number_format((float) ($order->total ?? $order->subtotal ?? 0), 2, '.', '');
            $gclid = $order->gclid ?: '';
            $gbraid = $order->gbraid ?: '';
            $wbraid = $order->wbraid ?: '';

            $rows[] = [
                'Google Click ID' => $gclid,
                'Conversion Name' => $conversionName,
                'Conversion Time' => $conversionTime,
                'Conversion Value' => $value,
                'Conversion Currency' => $currency,
                'GBRAID' => $gbraid,
                'WBRAID' => $wbraid,
                'Order ID' => (string) ($order->order_number ?: $order->id),
            ];

            $tableData[] = [
                $order->order_number ?: substr((string)$order->id, 0, 8),
                $order->status,
                $gclid ? substr($gclid, 0, 15) . '...' : ($gbraid ? 'GBRAID' : 'WBRAID'),
                "{$value} {$currency}",
                $conversionTime,
            ];
        }

        $this->table(
            ['N° Commande', 'Statut', 'Click ID', 'Valeur', 'Date / Heure Conversion'],
            $tableData
        );

        if ($this->option('dry-run')) {
            $this->warn('🧪 Mode DRY-RUN : aucun fichier généré, aucune commande marquée comme exportée.');
            return self::SUCCESS;
        }

        // Détermination du chemin de sortie
        $outputPath = $this->option('output');
        if (!$outputPath) {
            $exportDir = storage_path('app/exports/google-ads');
            if (!File::exists($exportDir)) {
                File::makeDirectory($exportDir, 0755, true);
            }
            $filename = 'google_ads_conversions_' . now()->format('Y-m-d_His') . '.csv';
            $outputPath = $exportDir . DIRECTORY_SEPARATOR . $filename;
        } else {
            $dir = dirname($outputPath);
            if (!File::exists($dir)) {
                File::makeDirectory($dir, 0755, true);
            }
        }

        // Écriture du fichier CSV officiel Google Ads
        $fp = fopen($outputPath, 'w');
        if (!$fp) {
            $this->error("Impossible d'écrire dans le fichier: {$outputPath}");
            return self::FAILURE;
        }

        // Ligne 1 : Paramètre TimeZone pour Google Ads
        fputcsv($fp, ["Parameters:TimeZone={$timezone}"]);

        // Ligne 2 : En-têtes standards Google Ads
        fputcsv($fp, [
            'Google Click ID',
            'Conversion Name',
            'Conversion Time',
            'Conversion Value',
            'Conversion Currency',
            'GBRAID',
            'WBRAID',
            'Order ID',
        ]);

        foreach ($rows as $row) {
            fputcsv($fp, array_values($row));
        }

        fclose($fp);

        // Marquer les commandes comme exportées
        $now = now();
        Order::whereIn('id', $orders->pluck('id'))->update([
            'ads_exported_at' => $now,
        ]);

        $this->info("📁 Fichier CSV généré avec succès :");
        $this->line("   👉 <fg=green>{$outputPath}</>");
        $this->info("🏷️ {$orders->count()} commande(s) marquée(s) comme exportée(s) le {$now->toDateTimeString()}.");

        return self::SUCCESS;
    }
}
