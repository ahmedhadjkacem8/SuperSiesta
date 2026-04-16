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

# Fix permissions
chmod -R 775 storage bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache 2>/dev/null || true

# ---- Test de connexion vers SQL Local ----
echo "⏳ [entrypoint] Test de connexion vers host.docker.internal..."
until php -r "try { new PDO('mysql:host=host.docker.internal;port=3306;dbname=SuperSiestaDB', 'root', ''); exit(0); } catch (Exception \$e) { exit(1); }" 2>/dev/null; do
    echo "   DB non prête (vérifiez bind-address et pare-feu sur Windows)..."
    sleep 3
done
echo "✅ [entrypoint] Connexion MySQL OK !"

# ---- Tasks ----
php artisan storage:link --force 2>/dev/null || true
php artisan config:cache
php artisan route:cache
php artisan view:cache

echo "✅ [entrypoint] Prêt. Lancement PHP-FPM..."
exec "$@"
