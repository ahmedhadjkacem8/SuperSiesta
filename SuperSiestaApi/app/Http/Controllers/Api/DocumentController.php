<?php

namespace App\Http\Controllers\Api;

use App\Models\Invoice;
use App\Models\DeliveryNote;
use App\Services\DocumentService;
use Illuminate\Http\Response;

class DocumentController extends BaseController
{
    /**
     * Download Invoice PDF
     */
    public function downloadInvoicePDF(Invoice $invoice): Response
    {
        $this->authorize('view', $invoice);

        $pdf = DocumentService::generateInvoicePDF($invoice);

        return response($pdf, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => "attachment; filename='invoice-{$invoice->invoice_number}.pdf'",
        ]);
    }

    /**
     * Download Delivery Note PDF
     */
    public function downloadDeliveryNotePDF(DeliveryNote $note): Response
    {
        $this->authorize('view', $note);

        $pdf = DocumentService::generateDeliveryNotePDF($note);

        return response($pdf, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => "attachment; filename='delivery-note-{$note->delivery_number}.pdf'",
        ]);
    }

    /**
     * Preview Invoice PDF (inline)
     */
    public function previewInvoicePDF(Invoice $invoice): Response
    {
        $this->authorize('view', $invoice);

        $pdf = DocumentService::generateInvoicePDF($invoice);

        return response($pdf, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => "inline; filename='invoice-{$invoice->invoice_number}.pdf'",
        ]);
    }

    /**
     * Preview Delivery Note PDF (inline)
     */
    public function previewDeliveryNotePDF(DeliveryNote $note): Response
    {
        $this->authorize('view', $note);

        $pdf = DocumentService::generateDeliveryNotePDF($note);

        return response($pdf, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => "inline; filename='delivery-note-{$note->delivery_number}.pdf'",
        ]);
    }
}
