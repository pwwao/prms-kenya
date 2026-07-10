# =============================================================================
# PRMS — Production Dockerfile
# Architecture Contract §1.2 — Node.js 20 LTS
# Security: non-root user, minimal Alpine image, no dev dependencies
# Multi-stage: builder (compile TS) → production (runtime only)
# =============================================================================

# ── Stage 1: Dependency cache ─────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

# Install only production deps for cache layer
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts \
    && npm cache clean --force

# ── Stage 2: Build (TypeScript compile) ──────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY tsconfig.json ./
COPY src ./src

RUN npm run build \
    && ls -la dist/

# ── Stage 3: Production runtime ───────────────────────────────────────────────
FROM node:20-alpine AS production

# Security hardening
RUN apk add --no-cache \
        dumb-init \
        curl \
    && apk upgrade --no-cache \
    && rm -rf /var/cache/apk/*

# Create non-root user/group — Architecture Contract §10.6 A05
RUN addgroup -g 1001 -S prms \
    && adduser -u 1001 -S prms -G prms

WORKDIR /app

# Copy built artefacts from previous stages
COPY --from=deps    --chown=prms:prms /app/node_modules ./node_modules
COPY --from=builder --chown=prms:prms /app/dist         ./dist
COPY --chown=prms:prms package.json ecosystem.config.cjs ./

# Create writable directories
RUN mkdir -p logs keys \
    && chown -R prms:prms /app

# Drop to non-root
USER prms

# Architecture Contract §15.2 — Backend API port
EXPOSE 3000

# Health check — used by Docker, ECS, and Nginx upstream checks
HEALTHCHECK \
    --interval=30s \
    --timeout=10s \
    --start-period=20s \
    --retries=3 \
    CMD curl -sf http://localhost:3000/health || exit 1

# Use dumb-init to reap zombie processes and forward signals correctly
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
