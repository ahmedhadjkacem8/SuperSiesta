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
     * Chemin absolu vers public/uploads/{folder}
     */
    protected function getUploadPath(): string
    {
        return public_path('uploads' . DIRECTORY_SEPARATOR . $this->getUploadFolder());
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

        return $this->getUploadBaseUrl() . '/' . $filename;
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
            // Utiliser le request pour obtenir le host correct (avec port), ou fallback au config
            $baseUrl = $this->getUploadBaseUrl();
            if (str_starts_with($url, $baseUrl)) {
                $relative = str_replace($baseUrl . '/', '', $url);
                $fullPath = public_path('uploads' . DIRECTORY_SEPARATOR . $relative);
                if (file_exists($fullPath)) {
                    unlink($fullPath);
                }
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
}
