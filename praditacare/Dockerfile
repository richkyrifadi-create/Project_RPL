# Image produksi PraditaCare: satu proses Node menyajikan API + web hasil build.
# Jalan di amd64 (VPS) dan arm64 (Raspberry Pi 4/5, Orange Pi 64-bit). Build langsung di mesin tujuan.
FROM node:22-bookworm-slim

# OpenSSL dibutuhkan Prisma engine.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependency dulu (layer di-cache selama package-lock.json tidak berubah).
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/api/prisma apps/api/prisma
RUN npm ci --no-fund --no-audit

# Sub-path tempat aplikasi diakses lewat reverse proxy, mis. https://<ip>/praditacare/
ARG VITE_BASE_PATH=/praditacare/
ENV VITE_BASE_PATH=${VITE_BASE_PATH}

COPY . .
RUN npm run build

ENV NODE_ENV=production \
    PORT=4000 \
    UPLOAD_DIR=/data/uploads \
    WEB_DIST_DIR=/app/apps/web/dist \
    TRUST_PROXY=1

RUN chmod +x deploy/docker/entrypoint.sh && mkdir -p /data/uploads && chown -R node:node /data /app/apps/api
USER node
WORKDIR /app/apps/api
EXPOSE 4000
HEALTHCHECK --interval=15s --timeout=5s --start-period=60s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:4000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["/app/deploy/docker/entrypoint.sh"]
