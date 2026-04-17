<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class UploadController extends Controller
{
    /**
     * Upload a file directly to public/uploads folder
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function store(Request $request)
    {
        try {
            // Check if file exists in request
            if (!$request->hasFile('file')) {
                return response()->json([
                    'error' => 'Aucun fichier fourni',
                    'message' => 'Le champ "file" est requis'
                ], 400);
            }

            $file = $request->file('file');
            
            // Validate file
            if (!$file->isValid()) {
                return response()->json([
                    'error' => 'Fichier invalide',
                    'message' => $file->getErrorMessage()
                ], 400);
            }

            // Validate it's an image
            if (!str_starts_with($file->getMimeType(), 'image/')) {
                return response()->json([
                    'error' => 'Fichier invalide',
                    'message' => 'Le fichier doit être une image'
                ], 400);
            }

            $folder = $request->input('folder', '');
            
            // Build the upload path under storage/app/public so Nginx can serve via /storage
            $uploadPath = 'storage' . DIRECTORY_SEPARATOR . ($folder ?: '');
            $storageFolder = $folder ?: '';

            // Ensure upload directory exists in storage/app/public/{folder}
            $fullPath = storage_path('app/public' . ($storageFolder ? DIRECTORY_SEPARATOR . $storageFolder : ''));
            if (!is_dir($fullPath)) {
                mkdir($fullPath, 0755, true);
            }

            // Generate unique filename
            $filename = time() . '_' . uniqid() . '.' . strtolower($file->getClientOriginalExtension());
            
            // Move the file
            $file->move($fullPath, $filename);

            // Build the public URL path (served via public/storage)
            $relativePath = '/storage/' . ($folder ? $folder . '/' : '') . $filename;
            $url = url($relativePath);

            return response()->json([
                'url' => $url,
                'path' => $relativePath,
                'file_name' => $filename,
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Erreur lors du téléchargement',
                'message' => $e->getMessage()
            ], 500);
        }
    }
}
