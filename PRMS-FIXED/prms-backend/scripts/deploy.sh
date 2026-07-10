#!/usr/bin/env bash
# =============================================================================
# PRMS — Zero-Downtime Rolling Deploy Script
# Called by GitHub Actions production-deploy.yml
# Architecture Contract §14.3 — Rolling deploy, auto-rollback
# =============================================================================

set -euo pipefail

COMPOSE_FILE="/opt/prms/docker-compose.prod.yml"
LOG_FILE="/opt/prms/logs/deploy_$(date +%Y%m%d_%H%M%S).log"

info()  { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [INFO] $*" | tee -a "$LOG_FILE"; }
error() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [ERROR] $*" | tee -a "$LOG_FILE"; exit 1; }

IMAGE_TAG="${IMAGE_TAG:-latest}"
ECR_REGISTRY="${ECR_REGISTRY:-}"
HEALTH_URL="http://localhost:3000/health"
HEALTH_RETRIES=12
HEALTH_INTERVAL=10

info "Deploy started: IMAGE_TAG=$IMAGE_TAG"

# ── Record current image for rollback ──────────────────────────────────────
PREVIOUS_IMAGE=$(docker inspect prms_api --format='{{.Config.Image}}' 2>/dev/null || echo "none")
info "Previous image: $PREVIOUS_IMAGE"
echo "$PREVIOUS_IMAGE" > /opt/prms/rollback_image.txt

# ── Pull new image ─────────────────────────────────────────────────────────
if [[ -n "$ECR_REGISTRY" ]]; then
  info "Logging into ECR..."
  aws ecr get-login-password --region af-south-1 \
    | docker login --username AWS --password-stdin "$ECR_REGISTRY"
fi

info "Pulling image: $IMAGE_TAG"
docker-compose -f "$COMPOSE_FILE" pull api

# ── Run DB migrations before traffic switch ────────────────────────────────
info "Running database migrations..."
docker-compose -f "$COMPOSE_FILE" run --rm \
  -e NODE_ENV=production \
  api node dist/database/migrate.js \
  2>&1 | tee -a "$LOG_FILE"

# ── Rolling restart — PM2-style via Docker ────────────────────────────────
info "Starting rolling deploy..."
docker-compose -f "$COMPOSE_FILE" up -d --no-deps --remove-orphans api

# ── Health check loop ─────────────────────────────────────────────────────
info "Waiting for health checks to pass..."
HEALTHY=false
for i in $(seq 1 $HEALTH_RETRIES); do
  HTTP_STATUS=$(curl -sf -o /dev/null -w "%{http_code}" "$HEALTH_URL" || echo "000")
  info "Health check $i/$HEALTH_RETRIES: HTTP $HTTP_STATUS"

  if [[ "$HTTP_STATUS" == "200" ]]; then
    HEALTHY=true
    break
  fi
  sleep $HEALTH_INTERVAL
done

# ── Rollback if unhealthy ─────────────────────────────────────────────────
if [[ "$HEALTHY" == "false" ]]; then
  error_msg="Health checks failed after $((HEALTH_RETRIES * HEALTH_INTERVAL))s — rolling back"
  info "❌ $error_msg"

  if [[ "$PREVIOUS_IMAGE" != "none" ]]; then
    info "Rolling back to: $PREVIOUS_IMAGE"
    IMAGE_TAG="$PREVIOUS_IMAGE" docker-compose -f "$COMPOSE_FILE" up -d --no-deps api
    sleep 15
    ROLLBACK_STATUS=$(curl -sf -o /dev/null -w "%{http_code}" "$HEALTH_URL" || echo "000")
    if [[ "$ROLLBACK_STATUS" == "200" ]]; then
      info "⏪ Rollback successful — running on previous image"
    else
      info "⚠️  Rollback also failed — manual intervention required"
    fi
  fi
  exit 1
fi

# ── Clean up old images ───────────────────────────────────────────────────
info "Pruning unused Docker images..."
docker image prune -f --filter "until=24h" 2>/dev/null || true

info "✅ Deploy complete: $IMAGE_TAG"
