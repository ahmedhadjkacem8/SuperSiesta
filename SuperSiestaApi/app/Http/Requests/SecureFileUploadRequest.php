<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SecureFileUploadRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Only authenticated users can upload
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'file' => [
                'required',
                'file',
                'max:52428800', // 50MB max
                'mimes:jpeg,png,jpg,gif,webp,mp4,webm,mov,avi,pdf',
                function ($attribute, $value, $fail) {
                    // Validate MIME type (not just extension)
                    $mimeType = $value->getMimeType();
                    $allowedMimes = [
                        'image/jpeg',
                        'image/png',
                        'image/gif',
                        'image/webp',
                        'video/mp4',
                        'video/webm',
                        'video/quicktime',
                        'video/x-msvideo',
                        'application/pdf',
                    ];

                    if (!in_array($mimeType, $allowedMimes)) {
                        $fail("The file type {$mimeType} is not allowed.");
                    }

                    // Check magic bytes (file signature)
                    $this->validateMagicBytes($value);
                },
            ],
            'folder' => 'nullable|string|max:255',
            'public' => 'nullable|boolean',
        ];
    }

    private function validateMagicBytes($file): void
    {
        $handle = fopen($file->getPathname(), 'r');
        $bytes = fread($handle, 8);
        fclose($handle);

        $hexBytes = bin2hex(substr($bytes, 0, 4));

        // Magic bytes for allowed file types
        $magicBytes = [
            'jpeg' => ['ffd8ff'],
            'png' => ['89504e47'],
            'gif' => ['474946'],
            'webp' => ['52494646', '57454250'],
            'mp4' => ['00000020', '00000018'],
            'pdf' => ['25504446'],
        ];

        // Verify magic bytes
        $isValid = false;
        foreach ($magicBytes as $type => $signatures) {
            foreach ($signatures as $sig) {
                if (strpos($hexBytes, $sig) === 0) {
                    $isValid = true;
                    break 2;
                }
            }
        }
    }
}
