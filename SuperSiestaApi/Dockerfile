# ============================================================
# SuperSiesta API — Production Dockerfile
# Laravel 12 + PHP 8.2-FPM + Composer
# ============================================================

# --------------- Stage 1: Composer dependencies ---------------
FROM composer:latest AS composer_deps

WORKDIR /app

# Copy only manifest files first for layer-caching
COPY composer.json composer.lock ./

RUN composer install \
    --no-dev \
    --no-scripts \
    --no-autoloader \
    --ignore-platform-reqs \
    --prefer-dist \
    --no-interaction

# Copy the full source then generate the optimized autoloader
COPY . .

RUN composer dump-autoload \
    --optimize \
    --no-dev \
    --no-scripts \
    --ignore-platform-reqs

# --------------- Stage 2: Final image -------------------------
FROM php:8.2-fpm-alpine AS production

LABEL maintainer="SuperSiesta Team"
LABEL description="SuperSiesta API - Laravel 12 backend"

# ---- System dependencies ----
RUN apk add --no-cache \
    bash \
    curl \
    libpng-dev \
    libzip-dev \
    zip \
    unzip \
    shadow \
    mysql-client \
    oniguruma-dev \
    freetype-dev \
    libjpeg-turbo-dev \
    git

# ---- PHP extensions ----
RUN docker-php-ext-configure gd \
        --with-freetype \
        --with-jpeg \
    && docker-php-ext-install -j$(nproc) \
        pdo \
        pdo_mysql \
        mbstring \
        exif \
        pcntl \
        bcmath \
        gd \
        zip \
        opcache

# ---- PHP-FPM tuning ----
COPY docker/php/php.ini      /usr/local/etc/php/conf.d/99-custom.ini
COPY docker/php/www.conf     /usr/local/etc/php-fpm.d/www.conf

# ---- Application user (non-root) ----
RUN addgroup -g 1000 appgroup && \
    adduser  -u 1000 -G appgroup -s /bin/sh -D appuser

WORKDIR /var/www/html

# ---- Copy vendor from composer stage ----
COPY --from=composer_deps --chown=appuser:appgroup /app/vendor ./vendor

# ---- Copy application source ----
COPY --chown=appuser:appgroup . .

# ---- Storage & cache permissions ----
RUN mkdir -p storage/framework/{cache,sessions,views} \
             storage/logs \
             bootstrap/cache \
    && chown -R appuser:appgroup storage bootstrap/cache \
    && chmod -R 775 storage bootstrap/cache

# ---- Switch to non-root user ----
USER appuser

# ---- Entrypoint ----
COPY --chown=appuser:appgroup docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 9000

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["php-fpm"]
