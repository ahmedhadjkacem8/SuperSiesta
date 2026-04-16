# ============================================================
# SuperSiesta Front — Production Dockerfile
# React 18 + Vite 5 → Nginx static server
# ============================================================

# --------------- Stage 1: Builder ----------------------------
FROM node:20-alpine AS builder

LABEL maintainer="SuperSiesta Team"

WORKDIR /app

# Layer-cache: install deps only when manifests change
COPY package.json package-lock.json ./

RUN npm ci --prefer-offline --legacy-peer-deps

# Copy source & build args
COPY . .

# VITE_API_URL is injected at build time via --build-arg
ARG VITE_API_URL=http://localhost/api
ENV VITE_API_URL=${VITE_API_URL}

RUN npm run build

# --------------- Stage 2: Runtime (Nginx) --------------------
FROM nginx:alpine AS production

LABEL maintainer="SuperSiesta Team"
LABEL description="SuperSiesta Frontend — static assets served by Nginx"

# Remove default Nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom Nginx config
COPY docker/nginx/frontend.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Health-check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost/health || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
