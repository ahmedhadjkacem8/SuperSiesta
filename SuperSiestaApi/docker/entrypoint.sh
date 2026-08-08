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

# ---- Test de connexion vers la Database (avec retries limités) ----
echo "⏳ [entrypoint] Test de connexion vers ${DB_HOST}:${DB_PORT:-3306}..."
MAX_RETRIES=10
RETRY_COUNT=0
DB_CONNECTED=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if php -r "try { new PDO('mysql:host=' . getenv('DB_HOST') . ';port=' . (getenv('DB_PORT') ?: '3306') . ';dbname=' . getenv('DB_DATABASE'), getenv('DB_USERNAME'), getenv('DB_PASSWORD')); exit(0); } catch (Exception \$e) { exit(1); }" 2>/dev/null; then
        DB_CONNECTED=1
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "   ⚠️ DB (${DB_HOST}) non prête ou inaccessible... (Tentative $RETRY_COUNT/$MAX_RETRIES)"
    sleep 3
done

if [ $DB_CONNECTED -eq 1 ]; then
    echo "✅ [entrypoint] Connexion MySQL OK !"
    php artisan config:cache || true
    php artisan route:cache || true
    php artisan view:cache || true
else
    echo "❌ [entrypoint] Échec de connexion à la DB (${DB_HOST}:${DB_PORT}) après $MAX_RETRIES tentatives."
    echo "⚠️ Démarrage de PHP-FPM malgré tout pour éviter de bloquer Nginx (Erreur 502)."
fi

echo "✅ [entrypoint] Prêt. Lancement PHP-FPM..."
exec "$@"
