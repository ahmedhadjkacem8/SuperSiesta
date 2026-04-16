<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bon de Livraison {{ $note->delivery_number }}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: #333;
            line-height: 1.4;
        }
        
        .container {
            max-width: 900px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 40px;
            border-bottom: 2px solid #10b981;
            padding-bottom: 20px;
        }
        
        .company-info h1 {
            color: #10b981;
            font-size: 28px;
            margin-bottom: 5px;
        }
        
        .company-info p {
            font-size: 12px;
            color: #666;
            margin: 3px 0;
        }
        
        .document-title {
            text-align: right;
        }
        
        .document-title h2 {
            font-size: 24px;
            color: #333;
            margin-bottom: 10px;
        }
        
        .delivery-details {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
            font-size: 13px;
        }
        
        .delivery-details > div {
            flex: 1;
        }
        
        .section-title {
            font-weight: bold;
            color: #10b981;
            margin-bottom: 5px;
            font-size: 12px;
            text-transform: uppercase;
        }
        
        .delivery-address, .delivery-meta {
            padding: 15px;
            background: #f0fdf4;
            border-radius: 5px;
            margin-bottom: 20px;
            border-left: 4px solid #10b981;
        }
        
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 30px 0;
        }
        
        .items-table thead {
            background: #10b981;
            color: white;
        }
        
        .items-table th {
            padding: 12px;
            text-align: left;
            font-weight: 600;
            font-size: 13px;
        }
        
        .items-table td {
            padding: 12px;
            border-bottom: 1px solid #e5e7eb;
            font-size: 13px;
        }
        
        .items-table tbody tr:hover {
            background: #f9fafb;
        }
        
        .items-table .text-right {
            text-align: right;
        }
        
        .signature-section {
            margin-top: 40px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
        }
        
        .signature-box {
            border-top: 2px solid #e5e7eb;
            padding-top: 15px;
            text-align: center;
            font-size: 13px;
        }
        
        .signature-box p {
            margin: 20px 0 5px 0;
            font-weight: bold;
        }
        
        .notes {
            margin-top: 30px;
            padding: 15px;
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            border-radius: 3px;
            font-size: 12px;
        }
        
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            font-size: 11px;
            color: #666;
        }
        
        .status-badge {
            display: inline-block;
            padding: 5px 10px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .status-pending {
            background: #f3f4f6;
            color: #6b7280;
        }
        
        .status-in-progress {
            background: #dbeafe;
            color: #1e40af;
        }
        
        .status-delivered {
            background: #dcfce7;
            color: #166534;
        }
        
        .qrcode {
            text-align: right;
            margin-top: 20px;
            font-size: 11px;
        }

        .gift-row td {
            background: #f0fdf4;
            padding: 6px 12px 6px 24px;
            font-size: 12px;
            color: #166534;
            border-bottom: 1px solid #bbf7d0;
        }

        .gift-badge {
            display: inline-block;
            background: #dcfce7;
            color: #166534;
            border: 1px solid #86efac;
            border-radius: 4px;
            padding: 1px 7px;
            font-size: 11px;
            font-weight: bold;
            margin-right: 6px;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <div class="company-info">
                @php
                    $logoPath = public_path('logo.png');
                    $logoSrc = '';
                    if(file_exists($logoPath)) {
                        $type = pathinfo($logoPath, PATHINFO_EXTENSION);
                        $data = file_get_contents($logoPath);
                        $logoSrc = 'data:image/' . $type . ';base64,' . base64_encode($data);
                    }
                @endphp
                @if($logoSrc)
                    <img src="{!! $logoSrc !!}" style="max-height: 70px; margin-bottom: 10px;" alt="Logo" />
                @else
                    <h1>{{ $company_name }}</h1>
                @endif
                <p>{{ $company_address }}</p>
                <p>Tel: {{ $company_phone }}</p>
                <p>Email: {{ $company_email }}</p>
            </div>
            <div class="document-title">
                <h2>BON DE LIVRAISON</h2>
                <span class="status-badge status-{{ str_replace('_', '-', $note->status) }}">
                    {{ match($note->status) {
                        'en_attente' => 'En attente',
                        'en_cours' => 'En cours',
                        'livrée' => 'Livrée',
                        'annulée' => 'Annulée',
                        default => ucfirst($note->status)
                    } }}
                </span>
            </div>
        </div>

        <!-- Delivery Details -->
        <div class="delivery-details">
            <div>
                <div class="section-title">N° Bon</div>
                <p>{{ $note->delivery_number }}</p>
            </div>
            <div>
                <div class="section-title">Date</div>
                <p>{{ $note->created_at->format('d/m/Y') }}</p>
            </div>
            @if($note->order)
            <div>
                <div class="section-title">Commande</div>
                <p>{{ $note->order->order_number }}</p>
            </div>
            @endif
        </div>

        <!-- Delivery Address -->
        <div class="delivery-address">
            <div class="section-title">Adresse de livraison</div>
            <p><strong>{{ $note->full_name }}</strong></p>
            <p>{{ $note->delivery_address }}</p>
            <p>{{ $note->delivery_city }}</p>
            @if($note->phone)
            <p>{{ $note->phone }}</p>
            @endif
        </div>

        <!-- Informations Livreur -->
        @if($note->delivery_man_name)
        <div class="delivery-meta" style="margin-top: 20px;">
            <div class="section-title">Livreur assigné</div>
            <p><strong>{{ $note->delivery_man_name }}</strong></p>
            @if($note->deliveryMan)
                @if($note->deliveryMan->phone) <p>Tél: {{ $note->deliveryMan->phone }}</p> @endif
                @if($note->deliveryMan->vehicle) <p>Véhicule: <span dir="auto">{{ $note->deliveryMan->vehicle }}</span></p> @endif
            @endif
        </div>
        @endif

        <!-- Items Table -->
        <table class="items-table">
            <thead>
                <tr>
                    <th>Article</th>
                    <th class="text-right" style="width: 120px;">Quantité commandée</th>
                    <th class="text-right" style="width: 120px;">Quantité livrée</th>
                    <th class="text-right" style="width: 100px;">Observation</th>
                </tr>
            </thead>
            <tbody>
                @forelse($note->items as $item)
                <tr>
                    <td>
                        <strong>{{ $item->product_name }}</strong><br>
                        <small style="color: #666;">Taille: {{ $item->size_label }}</small>
                        @if($item->grammage)
                            <br><small style="color: #666;">Grammage: {{ $item->grammage }}</small>
                        @endif
                    </td>
                    <td class="text-right">{{ $item->quantity }}</td>
                    <td class="text-right">
                        <strong>{{ $item->delivered_quantity ?? $item->quantity }}</strong>
                    </td>
                    <td class="text-right">
                        @if(($item->delivered_quantity ?? $item->quantity) < $item->quantity)
                            <span style="color: #d97706; font-weight: bold;">Partiel</span>
                        @else
                            <span style="color: #10b981; font-weight: bold;">✓</span>
                        @endif
                    </td>
                </tr>
                @if($item->product && $item->product->freeGifts->count() > 0)
                    @foreach($item->product->freeGifts as $gift)
                    @php
                        $giftGrammage = $item->gifts_grammage[$gift->id] ?? $gift->poids;
                        $giftImageSrc = '';
                        if ($gift->image) {
                            $giftPath = public_path(str_replace('/storage/', 'storage/', parse_url($gift->image, PHP_URL_PATH)));
                            if (file_exists($giftPath)) {
                                $type = pathinfo($giftPath, PATHINFO_EXTENSION);
                                $data = file_get_contents($giftPath);
                                $giftImageSrc = 'data:image/' . $type . ';base64,' . base64_encode($data);
                            } else {
                                $giftImageSrc = $gift->image; // Fallback to URL
                            }
                        }
                    @endphp
                    <tr class="gift-row">
                        <td colspan="4" style="padding: 10px 15px 10px 25px; vertical-align: middle;">
                            @if($giftImageSrc)
                                <img src="{!! $giftImageSrc !!}" style="display: inline-block; width: 35px; height: 35px; border-radius: 4px; margin: 0 10px; vertical-align: middle; object-fit: cover;" alt="" />
                            @endif
                            <span style="font-weight: bold; font-size: 13px; vertical-align: middle;">{{ $gift->titre }}</span>
                            @if($giftGrammage)
                                <span style="float: right; font-weight: bold; color: #15803d; background: #fff; padding: 2px 10px; border-radius: 4px; border: 1px solid #86efac; font-size: 11px; margin-top: 5px;">
                                    {{ $giftGrammage }} g
                                </span>
                            @endif
                        </td>
                    </tr>
                    @endforeach
                @endif
                @empty
                <tr>
                    <td colspan="4" style="text-align: center; padding: 30px; color: #999;">
                        Aucun article
                    </td>
                </tr>
                @endforelse
            </tbody>
        </table>

        <!-- Notes -->
        @if($note->notes)
        <div class="notes">
            <strong>Notes de livraison:</strong>
            <p>{{ $note->notes }}</p>
        </div>
        @endif

        <!-- Footer -->
        <div class="footer">
            <p>Merci de vérifier l'intégrité du colis à la réception</p>
            <p style="margin-top: 10px; font-size: 10px;">
                Document généré automatiquement le {{ now()->format('d/m/Y à H:i') }}
                | BL: {{ $note->delivery_number }}
            </p>
        </div>
    </div>
</body>
</html>
