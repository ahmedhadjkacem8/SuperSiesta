<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\DeliveryNote;
use Dompdf\Dompdf;
use Illuminate\Support\Facades\View;

class DocumentService
{
    /**
     * Generate Invoice PDF
     */
    public static function generateInvoicePDF(Invoice $invoice): string
    {
        $invoice->load('items', 'client', 'order');
        
        $html = View::make('documents.invoice', [
            'invoice' => $invoice,
            'company_name' => config('app.name'),
            'company_address' => config('app.company_address'),
            'company_phone' => config('app.company_phone'),
            'company_email' => config('app.company_email'),
        ])->render();

        $dompdf = new Dompdf();
        $dompdf->loadHtml($html);
        $dompdf->setPaper('A4');
        $dompdf->render();

        return $dompdf->output();
    }

    /**
     * Generate Delivery Note PDF
     */
    public static function generateDeliveryNotePDF(DeliveryNote $note): string
    {
        $note->load('items.product.freeGifts', 'order', 'deliveryMan');
        
        $html = View::make('documents.delivery-note', [
            'note' => $note,
            'company_name' => config('app.name'),
            'company_address' => config('app.company_address'),
            'company_phone' => config('app.company_phone'),
            'company_email' => config('app.company_email'),
        ])->render();

        $dompdf = new Dompdf();
        $options = $dompdf->getOptions();
        $options->set('isRemoteEnabled', true);
        $options->set('isHtml5ParserEnabled', true);
        $options->set('chroot', public_path());
        $dompdf->setOptions($options);
        $dompdf->loadHtml($html);
        $dompdf->setPaper('A4');
        $dompdf->render();

        return $dompdf->output();
    }
}
