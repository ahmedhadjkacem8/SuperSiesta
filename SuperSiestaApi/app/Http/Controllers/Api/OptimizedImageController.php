<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class OptimizedImageController
{
    private const WIDTHS = [96, 192, 384, 768, 1200, 1600];

    public function show(Request $request, string $path): BinaryFileResponse
    {
        $validated = $request->validate([
            'width' => ['required', 'integer', Rule::in(self::WIDTHS)],
        ]);

        $path = ltrim($path, '/');
        abort_if(str_contains($path, '..'), 404);

        $allowedDirectories = ['blog-posts/', 'hero-slides/', 'gammes/', 'uploads/', 'products/', 'promo/', 'free_gifts/'];
        abort_unless(
            collect($allowedDirectories)->contains(fn (string $directory) => str_starts_with($path, $directory)),
            404
        );

        $disk = Storage::disk('public');
        abort_unless($disk->exists($path), 404);

        $sourcePath = $disk->path($path);
        $imageInfo = getimagesize($sourcePath);
        abort_unless($imageInfo !== false, 415);
        abort_unless(
            function_exists('imagewebp') && function_exists('imagecreatefromwebp'),
            501,
            'WebP image support is not available.'
        );

        [$sourceWidth, $sourceHeight, $imageType] = $imageInfo;
        abort_if($sourceWidth < 1 || $sourceHeight < 1 || $sourceWidth * $sourceHeight > 40000000, 413);

        $targetWidth = min((int) $validated['width'], $sourceWidth);
        $variantPath = 'optimized/' . hash('sha256', $path . ':' . $disk->lastModified($path) . ':' . $targetWidth) . '.webp';
        if ($disk->exists($variantPath)) {
            return response()->file($disk->path($variantPath), [
                'Content-Type' => 'image/webp',
                'Cache-Control' => 'public, max-age=31536000, immutable',
                'ETag' => '"' . basename($variantPath, '.webp') . '"',
            ]);
        }

        $sourceImage = match ($imageType) {
            IMAGETYPE_JPEG => imagecreatefromjpeg($sourcePath),
            IMAGETYPE_PNG => imagecreatefrompng($sourcePath),
            IMAGETYPE_WEBP => imagecreatefromwebp($sourcePath),
            default => false,
        };
        abort_unless($sourceImage !== false, 415);

        $targetHeight = max(1, (int) round($sourceHeight * $targetWidth / $sourceWidth));
        $targetImage = imagecreatetruecolor($targetWidth, $targetHeight);
        imagealphablending($targetImage, false);
        imagesavealpha($targetImage, true);

        if (!imagecopyresampled(
            $targetImage,
            $sourceImage,
            0,
            0,
            0,
            0,
            $targetWidth,
            $targetHeight,
            $sourceWidth,
            $sourceHeight
        )) {
            imagedestroy($sourceImage);
            imagedestroy($targetImage);
            abort(500, 'Unable to resize image.');
        }

        $absoluteVariantPath = $disk->path($variantPath);
        $variantDirectory = dirname($absoluteVariantPath);

        if (!is_dir($variantDirectory) && !mkdir($variantDirectory, 0755, true) && !is_dir($variantDirectory)) {
            imagedestroy($sourceImage);
            imagedestroy($targetImage);
            abort(500, 'Unable to create optimized image directory.');
        }

        $temporaryPath = $absoluteVariantPath . '.' . bin2hex(random_bytes(6)) . '.tmp';
        $written = imagewebp($targetImage, $temporaryPath, 78);
        $renamed = $written && rename($temporaryPath, $absoluteVariantPath);
        if (!$renamed && is_file($absoluteVariantPath)) {
            $renamed = true;
            if (is_file($temporaryPath)) {
                unlink($temporaryPath);
            }
        }
        if (!$renamed) {
            if (is_file($temporaryPath)) {
                unlink($temporaryPath);
            }
            imagedestroy($sourceImage);
            imagedestroy($targetImage);
            abort(500, 'Unable to generate optimized image.');
        }

        imagedestroy($sourceImage);
        imagedestroy($targetImage);

        return response()->file($absoluteVariantPath, [
            'Content-Type' => 'image/webp',
            'Cache-Control' => 'public, max-age=31536000, immutable',
            'ETag' => '"' . basename($variantPath, '.webp') . '"',
        ]);
    }
}
