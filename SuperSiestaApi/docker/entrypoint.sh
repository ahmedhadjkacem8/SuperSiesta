#!/bin/sh

echo "🚀 [entrypoint] Démarrage SuperSiesta API..."

# ---- Création forcée des dossiers de cache Laravel ----
echo "📁 [entrypoint] Vérification des dossiers de stockage..."
mkdir -p storage/framework/cache/data \
         storage/framework/sessions \
         storage/framework/views \
         storage/app/public \
         storage/logs \
         bootstrap/cache

# Fix permissions (appuser = uid 1000, défini dans le Dockerfile)
chmod -R 775 storage bootstrap/cache
chown -R 1000:1000 storage bootstrap/cache 2>/dev/null || true

# ---- Test de connexion vers la Database ----
echo "⏳ [entrypoint] Test de connexion vers ${DB_HOST}..."
until php -r "try { new PDO('mysql:host=' . getenv('DB_HOST') . ';port=' . getenv('DB_PORT') . ';dbname=' . getenv('DB_DATABASE'), getenv('DB_USERNAME'), getenv('DB_PASSWORD')); exit(0); } catch (Exception \$e) { exit(1); }" 2>/dev/null; do
    echo "   DB (${DB_HOST}) non prête ou inaccessible... (vérifiez vos variables .env)"
    sleep 3
done
echo "✅ [entrypoint] Connexion MySQL OK !"

# ---- Tasks ----
# Note: storage:link n'est plus nécessaire car Nginx utilise alias directement
php artisan config:cache
php artisan route:cache
php artisan view:cache

echo "✅ [entrypoint] Prêt. Lancement PHP-FPM..."
exec "$@"
