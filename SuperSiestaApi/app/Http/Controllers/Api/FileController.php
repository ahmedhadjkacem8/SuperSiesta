<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\ResponseHeaderBag;

class FileController extends BaseController
{
    private const MIME_TYPES = [
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'png' => 'image/png',
        'gif' => 'image/gif',
        'webp' => 'image/webp',
        'mp4' => 'video/mp4',
        'webm' => 'video/webm',
        'mov' => 'video/quicktime',
        'avi' => 'video/x-msvideo',
        'pdf' => 'application/pdf',
    ];

    private const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'webm', 'mov', 'avi', 'pdf'];

    /**
     * Serve a protected image or video file
     * Access is controlled via Sanctum authentication
     */
    public function serve(Request $request)
    {
        // Validate path parameter
        $path = $request->route('path');
        
        if (!$path) {
            abort(404, 'File not found');
        }

        // Security: Prevent directory traversal attacks
        if (strpos($path, '..') !== false || strpos($path, '//') !== false) {
            abort(403, 'Unauthorized access');
        }

        // Get file extension
        $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
        
        // Validate extension
        if (!in_array($ext, self::ALLOWED_EXTENSIONS)) {
            abort(403, 'File type not allowed');
        }

        // Check if file exists
        if (!Storage::disk('public')->exists($path)) {
            abort(404, 'File not found');
        }

        // Get MIME type from mapping (more reliable)
        $mimeType = self::MIME_TYPES[$ext] ?? 'application/octet-stream';

        // Get file size
        try {
            $fileSize = Storage::disk('public')->size($path);
        } catch (\Exception $e) {
            abort(500, 'Could not determine file size');
        }

        // Get the full file path for streaming
        $file = Storage::disk('public')->path($path);

        // Return file response with proper headers
        return response()->file($file, [
            'Content-Type' => $mimeType,
            'Content-Length' => $fileSize,
            'Cache-Control' => 'private, max-age=86400',
            'Content-Disposition' => ResponseHeaderBag::DISPOSITION_INLINE,
            'X-Content-Type-Options' => 'nosniff',
            'Access-Control-Allow-Origin' => '*',
            'Access-Control-Allow-Methods' => 'GET, OPTIONS',
        ]);
    }

    /**
     * Get a signed download URL (temporary access)
     * URLs expire after 1 hour and can only be used once per request
     */
    public function getSignedUrl(Request $request): \Illuminate\Http\JsonResponse
    {
        $validated = $request->validate([
            'path' => 'required|string|max:255',
        ]);

        $path = $validated['path'];

        // Security: Prevent directory traversal
        if (strpos($path, '..') !== false) {
            return $this->sendError('Invalid path', 403);
        }

        try {
            // Generate a signed URL valid for 1 hour
            $url = Storage::disk('public')->temporaryUrl(
                $path,
                now()->addHour(),
                [
                    'ResponseContentDisposition' => 'inline',
                ]
            );

            return $this->sendResponse(['url' => $url], 'Signed URL generated');
        } catch (\Exception $e) {
            return $this->sendError('Could not generate URL', 500);
        }
    }
}
