<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Facture {{ $invoice->invoice_number }}</title>
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
            border-bottom: 2px solid #3b82f6;
            padding-bottom: 20px;
        }
        
        .company-info h1 {
            color: #3b82f6;
            font-size: 28px;
            margin-bottom: 5px;
        }
        
        .company-info p {
            font-size: 12px;
            color: #666;
            margin: 3px 0;
        }
        
        .invoice-title {
            text-align: right;
        }
        
        .invoice-title h2 {
            font-size: 24px;
            color: #333;
            margin-bottom: 10px;
        }
        
        .invoice-details {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
            font-size: 13px;
        }
        
        .invoice-details > div {
            flex: 1;
        }
        
        .section-title {
            font-weight: bold;
            color: #3b82f6;
            margin-bottom: 5px;
            font-size: 12px;
            text-transform: uppercase;
        }
        
        .bill-to, .invoice-meta {
            padding: 15px;
            background: #f3f4f6;
            border-radius: 5px;
            margin-bottom: 20px;
        }
        
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 30px 0;
        }
        
        .items-table thead {
            background: #3b82f6;
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
        
        .summary {
            margin-top: 30px;
            display: flex;
            justify-content: flex-end;
        }
        
        .summary-box {
            width: 350px;
            border: 1px solid #e5e7eb;
            border-radius: 5px;
            overflow: hidden;
        }
        
        .summary-row {
            display: flex;
            justify-content: space-between;
            padding: 12px 20px;
            border-bottom: 1px solid #e5e7eb;
            font-size: 13px;
        }
        
        .summary-row.total {
            background: #3b82f6;
            color: white;
            font-weight: bold;
            font-size: 16px;
            border: none;
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
        
        .status-draft {
            background: #f3f4f6;
            color: #6b7280;
        }
        
        .status-sent {
            background: #dbeafe;
            color: #1e40af;
        }
        
        .status-paid {
            background: #dcfce7;
            color: #166534;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <div class="company-info">
                <h1>{{ $company_name }}</h1>
                <p>{{ $company_address }}</p>
                <p>Tel: {{ $company_phone }}</p>
                <p>Email: {{ $company_email }}</p>
            </div>
            <div class="invoice-title">
                <h2>FACTURE</h2>
                <span class="status-badge status-{{ $invoice->status }}">
                    {{ ucfirst($invoice->status) }}
                </span>
            </div>
        </div>

        <!-- Invoice Details -->
        <div class="invoice-details">
            <div>
                <div class="section-title">N° Facture</div>
                <p>{{ $invoice->invoice_number }}</p>
            </div>
            <div>
                <div class="section-title">Date</div>
                <p>{{ $invoice->created_at->format('d/m/Y') }}</p>
            </div>
            <div>
                <div class="section-title">Date limite de paiement</div>
                <p>{{ $invoice->due_date ? $invoice->due_date->format('d/m/Y') : 'À convenir' }}</p>
            </div>
        </div>

        <!-- Bill To -->
        @if($invoice->client || $invoice->order)
        <div class="bill-to">
            <div class="section-title">Facturation à la demande de</div>
            @if($invoice->client)
                <p><strong>{{ $invoice->client->company_name ?? $invoice->client->contact_name }}</strong></p>
                <p>{{ $invoice->client->address }}</p>
                <p>{{ $invoice->client->postal_code }} {{ $invoice->client->city }}</p>
                <p>{{ $invoice->client->phone }}</p>
                <p>{{ $invoice->client->email }}</p>
            @elseif($invoice->order)
                <p><strong>{{ $invoice->order->full_name }}</strong></p>
                <p>{{ $invoice->order->address }}</p>
                <p>{{ $invoice->order->city }}</p>
                <p>{{ $invoice->order->phone }}</p>
                <p>{{ $invoice->order->email }}</p>
            @endif
        </div>
        @endif

        <!-- Items Table -->
        <table class="items-table">
            <thead>
                <tr>
                    <th>Description</th>
                    <th class="text-right" style="width: 100px;">Quantité</th>
                    <th class="text-right" style="width: 120px;">Prix unitaire</th>
                    <th class="text-right" style="width: 120px;">Total</th>
                </tr>
            </thead>
            <tbody>
                @forelse($invoice->items as $item)
                <tr>
                    <td>{{ $item->description }}</td>
                    <td class="text-right">{{ $item->quantity }}</td>
                    <td class="text-right">{{ number_format($item->unit_price, 2, ',', ' ') }} €</td>
                    <td class="text-right"><strong>{{ number_format($item->total, 2, ',', ' ') }} €</strong></td>
                </tr>
                @empty
                <tr>
                    <td colspan="4" style="text-align: center; padding: 30px; color: #999;">
                        Aucun article
                    </td>
                </tr>
                @endforelse
            </tbody>
        </table>

        <!-- Summary -->
        <div class="summary">
            <div class="summary-box">
                <div class="summary-row">
                    <span>Sous-total</span>
                    <span>{{ number_format($invoice->total / (1 + $invoice->tax_rate / 100), 2, ',', ' ') }} €</span>
                </div>
                @if($invoice->tax_rate > 0)
                <div class="summary-row">
                    <span>TVA ({{ $invoice->tax_rate }}%)</span>
                    <span>{{ number_format($invoice->total - ($invoice->total / (1 + $invoice->tax_rate / 100)), 2, ',', ' ') }} €</span>
                </div>
                @endif
                <div class="summary-row total">
                    <span>Montant total TTC</span>
                    <span>{{ number_format($invoice->total, 2, ',', ' ') }} €</span>
                </div>
            </div>
        </div>

        <!-- Notes -->
        @if($invoice->notes)
        <div class="notes">
            <strong>Notes:</strong>
            <p>{{ $invoice->notes }}</p>
        </div>
        @endif

        <!-- Footer -->
        <div class="footer">
            <p>Merci pour votre confiance!</p>
            <p style="margin-top: 10px; font-size: 10px;">
                Document généré automatiquement le {{ now()->format('d/m/Y à H:i') }}
            </p>
        </div>
    </div>
</body>
</html>
