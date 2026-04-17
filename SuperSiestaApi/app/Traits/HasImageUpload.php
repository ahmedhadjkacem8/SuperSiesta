<?php

namespace App\Traits;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;

trait HasImageUpload
{
    /**
     * Retourne le sous-dossier d'upload propre au modèle.
     * Chaque modèle utilisant ce trait DOIT définir cette propriété :
     *   protected string $uploadFolder = 'products';
     */
    protected function getUploadFolder(): string
    {
        return property_exists($this, 'uploadFolder') ? $this->uploadFolder : 'uploads';
    }

    /**
     * Chemin absolu vers storage/app/public/{folder}
     */
    protected function getUploadPath(): string
    {
        return storage_path('app/public' . DIRECTORY_SEPARATOR . $this->getUploadFolder());
    }

    /**
     * URL publique de base : {SCHEME}://{HOST}/uploads/{folder}
     * Utilise request() pour obtenir le port correct (ex: :8000)
     */
    protected function getUploadBaseUrl(): string
    {
        $scheme = request()->getScheme();
        $host = request()->getHttpHost();
        return "{$scheme}://{$host}/uploads/" . $this->getUploadFolder();
    }

    /**
     * Sauvegarde un fichier uploadé dans public/uploads/{folder}/
     * Supprime l'ancienne image locale si fournie.
     * Retourne l'URL publique du fichier sauvegardé.
     */
    public function saveUploadedImage(UploadedFile $file, ?string $oldPath = null): string
    {
        // Créer le dossier si nécessaire
        $uploadPath = $this->getUploadPath();
        if (!is_dir($uploadPath)) {
            mkdir($uploadPath, 0755, true);
        }

        // Supprimer l'ancienne image locale
        if ($oldPath) {
            $this->deleteLocalImage($oldPath);
        }

        // Générer un nom unique
        $extension = strtolower($file->getClientOriginalExtension());
        $filename  = uniqid($this->getUploadFolder() . '_', true) . '.' . $extension;

        // Déplacer le fichier
        $file->move($uploadPath, $filename);

        // Retourner le chemin relatif via `public/storage` pour être servi par Nginx,
        // par ex. /storage/{folder}/{filename}
        return '/storage/' . $this->getUploadFolder() . '/' . $filename;
    }

    /**
     * Sauvegarde un ou plusieurs fichiers uploadés.
     * Supprime les anciennes images locales si fournies.
     *
     * @param  UploadedFile|UploadedFile[]  $files
     * @param  string[]                     $oldPaths
     * @return string[]
     */
    public function saveUploadedImages(mixed $files, array $oldPaths = []): array
    {
        foreach ($oldPaths as $oldPath) {
            if (is_array($oldPath)) {
                foreach ($oldPath as $nestedPath) {
                    $this->deleteLocalImage($nestedPath);
                }
            } else {
                $this->deleteLocalImage($oldPath);
            }
        }

        if (!$files) {
            return [];
        }

        // Transformer en tableau si ce n'est pas déjà le cas
        $filesToProcess = is_array($files) ? $files : [$files];

        $urls = [];
        foreach ($filesToProcess as $file) {
            if ($file instanceof UploadedFile) {
                $urls[] = $this->saveUploadedImage($file);
            }
        }

        return $urls;
    }

    /**
     * Supprime une image locale si l'URL pointe vers notre serveur.
     */
    public function deleteLocalImage(mixed $url): void
    {
        if (!is_string($url) || empty($url)) {
            return;
        }

        try {
            // Supporte plusieurs formats stockés précédemment ou externes :
            // - URL complète (http://host/...) contenant /storage/{folder}/...
            // - chemin relatif via /storage/{folder}/...
            // - ancien format /uploads/{folder}/... (au cas où)

            $storagePrefix = '/storage/' . $this->getUploadFolder();
            $uploadsPrefix = '/uploads/' . $this->getUploadFolder();

            $relative = null;
            // URL complète vers /storage
            $parsedPath = is_string($url) ? parse_url($url, PHP_URL_PATH) : null;
            if (is_string($url) && str_starts_with($url, $storagePrefix)) {
                $relative = substr($url, strlen($storagePrefix) + 1);
            } elseif ($parsedPath && str_starts_with($parsedPath, $storagePrefix)) {
                $relative = substr($parsedPath, strlen($storagePrefix) + 1);
            } elseif (is_string($url) && str_starts_with($url, $uploadsPrefix)) {
                // ancien emplacement public/uploads
                $relative = substr($url, strlen($uploadsPrefix) + 1);
                // la racine pour les anciens fichiers est public/uploads
                $fullPath = public_path('uploads' . DIRECTORY_SEPARATOR . $this->getUploadFolder() . DIRECTORY_SEPARATOR . $relative);
            } elseif ($parsedPath && str_starts_with($parsedPath, $uploadsPrefix)) {
                $relative = substr($parsedPath, strlen($uploadsPrefix) + 1);
                $fullPath = public_path('uploads' . DIRECTORY_SEPARATOR . $this->getUploadFolder() . DIRECTORY_SEPARATOR . $relative);
            }

            if ($relative !== null && !isset($fullPath)) {
                $fullPath = $this->getUploadPath() . DIRECTORY_SEPARATOR . $relative;
            }

            if (file_exists($fullPath)) {
                unlink($fullPath);
            }
        } catch (\Throwable $e) {
            Log::warning('HasImageUpload: impossible de supprimer le fichier', [
                'url'   => $url,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Supprime toutes les images locales liées au modèle.
     * À appeler dans booted() → deleting().
     *
     * @param  string[]  $imageFields  Noms des attributs contenant des URLs
     */
    public function deleteAllImages(array $imageFields = []): void
    {
        foreach ($imageFields as $field) {
            $value = $this->{$field};
            if (is_array($value)) {
                foreach ($value as $url) {
                    if (is_string($url) && $url) {
                        $this->deleteLocalImage($url);
                    }
                }
            } elseif (is_string($value) && $value) {
                $this->deleteLocalImage($value);
            }
        }
    }

    /**
     * Eloquent accessor pour renvoyer l'URL publique complète pour `image_url`.
     * Si la valeur est déjà une URL complète, la retourne telle quelle.
     */
    public function getImageUrlAttribute(mixed $value): mixed
    {
        if (!is_string($value) || $value === '') {
            return $value;
        }

        if (str_starts_with($value, 'http://') || str_starts_with($value, 'https://')) {
            return $value;
        }

        // Si l'ancien format stockait `/uploads/...`, le convertir en `/storage/...`
        if (str_starts_with($value, '/uploads/')) {
            $value = str_replace('/uploads/', '/storage/', $value);
        }

        return url($value);
    }

    /**
     * Eloquent accessor pour renvoyer les URLs publiques complètes pour `images` (array).
     */
    public function getImagesAttribute(mixed $value): mixed
    {
        if (is_null($value) || $value === '') {
            return $value;
        }

        $images = is_array($value) ? $value : json_decode($value, true);
        if (!is_array($images)) {
            return $value;
        }

        return array_map(function ($item) {
            if (!is_string($item) || $item === '') {
                return $item;
            }
            if (str_starts_with($item, 'http://') || str_starts_with($item, 'https://')) {
                return $item;
            }
            if (str_starts_with($item, '/uploads/')) {
                $item = str_replace('/uploads/', '/storage/', $item);
            }
            return url($item);
        }, $images);
    }
}
