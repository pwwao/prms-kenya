#!/usr/bin/env bash
# =============================================================================
# PRMS — Secret Management & Rotation Script
# OWASP A02, A05 — Cryptographic failures, Security misconfiguration
# =============================================================================
# Usage:
#   ./secrets.sh init           — First-time secret generation
#   ./secrets.sh rotate-jwt     — Rotate JWT key pair (zero-downtime)
#   ./secrets.sh rotate-db-key  — Rotate AES-256-GCM encryption key
#   ./secrets.sh verify         — Verify all secrets are present and valid
#   ./secrets.sh audit          — Print secret metadata (never values)
# =============================================================================

set -euo pipefail

KEYS_DIR="./keys"
SECRETS_DIR="./secrets"
ENV_FILE=".env"
BACKUP_DIR="./secrets/backups/$(date +%Y%m%d_%H%M%S)"

# Colours
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()    { echo -e "${GREEN}[INFO]${NC} $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

# ─── Verify required tools ────────────────────────────────────────────────────
check_deps() {
  for cmd in openssl node aws; do
    command -v "$cmd" &>/dev/null || error "Required tool not found: $cmd"
  done
}

# ─── init — First-time secret generation ─────────────────────────────────────
cmd_init() {
  info "Initialising PRMS secrets..."

  mkdir -p "$KEYS_DIR" "$SECRETS_DIR"

  # ── JWT RSA key pair (RS256) ──────────────────────────────────────────────
  if [[ -f "$KEYS_DIR/jwt.private.key" ]]; then
    warn "JWT keys already exist — skipping. Use 'rotate-jwt' to rotate."
  else
    info "Generating RS256 JWT key pair (4096-bit)..."
    openssl genrsa -out "$KEYS_DIR/jwt.private.key" 4096 2>/dev/null
    openssl rsa -in "$KEYS_DIR/jwt.private.key" -pubout -out "$KEYS_DIR/jwt.public.key" 2>/dev/null
    chmod 600 "$KEYS_DIR/jwt.private.key"
    chmod 644 "$KEYS_DIR/jwt.public.key"
    info "✅ JWT keys generated at $KEYS_DIR/"
  fi

  # ── AES-256-GCM encryption key ────────────────────────────────────────────
  if grep -q "^DATABASE_ENCRYPTION_KEY=replace" "$ENV_FILE" 2>/dev/null || \
     ! grep -q "^DATABASE_ENCRYPTION_KEY=" "$ENV_FILE" 2>/dev/null; then
    ENC_KEY=$(openssl rand -hex 32)
    HASH_SALT=$(openssl rand -hex 32)
    info "Generated encryption key and hash salt."
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Add these to your .env (NEVER commit these values):"
    echo ""
    echo "DATABASE_ENCRYPTION_KEY=$ENC_KEY"
    echo "HASH_SALT=$HASH_SALT"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    warn "Store these in AWS Secrets Manager or your secrets vault."
  else
    warn "DATABASE_ENCRYPTION_KEY already set — skipping."
  fi

  # ── MySQL docker secrets ──────────────────────────────────────────────────
  if [[ ! -f "$SECRETS_DIR/mysql_root_password.txt" ]]; then
    openssl rand -base64 32 | tr -dc 'A-Za-z0-9!@#$%^&*' | head -c 32 \
      > "$SECRETS_DIR/mysql_root_password.txt"
    openssl rand -base64 32 | tr -dc 'A-Za-z0-9!@#$%^&*' | head -c 32 \
      > "$SECRETS_DIR/mysql_password.txt"
    chmod 600 "$SECRETS_DIR/"*.txt
    info "✅ MySQL secrets generated at $SECRETS_DIR/"
  fi

  info "✅ Secret initialisation complete."
}

# ─── rotate-jwt — Zero-downtime JWT key rotation ─────────────────────────────
cmd_rotate_jwt() {
  info "Rotating JWT RS256 key pair..."
  info "⚠️  Active sessions will remain valid until their 15-minute TTL expires."

  mkdir -p "$BACKUP_DIR"
  cp "$KEYS_DIR/jwt.private.key" "$BACKUP_DIR/jwt.private.key.bak"
  cp "$KEYS_DIR/jwt.public.key"  "$BACKUP_DIR/jwt.public.key.bak"
  info "Backed up old keys to $BACKUP_DIR"

  # Generate new keys
  openssl genrsa -out "$KEYS_DIR/jwt.private.key.new" 4096 2>/dev/null
  openssl rsa -in "$KEYS_DIR/jwt.private.key.new" -pubout \
    -out "$KEYS_DIR/jwt.public.key.new" 2>/dev/null

  # Atomic swap
  mv "$KEYS_DIR/jwt.private.key.new" "$KEYS_DIR/jwt.private.key"
  mv "$KEYS_DIR/jwt.public.key.new"  "$KEYS_DIR/jwt.public.key"
  chmod 600 "$KEYS_DIR/jwt.private.key"

  info "✅ JWT keys rotated."
  warn "Restart the API to pick up new keys: docker-compose restart api"
  warn "All existing access tokens will expire within 15 minutes."
  warn "All refresh tokens are immediately invalid — users must re-login."
}

# ─── verify — Check all secrets are present ───────────────────────────────────
cmd_verify() {
  info "Verifying secrets..."
  ERRORS=0

  # JWT keys
  [[ -f "$KEYS_DIR/jwt.private.key" ]] || { error_count "Missing: $KEYS_DIR/jwt.private.key"; ERRORS=$((ERRORS+1)); }
  [[ -f "$KEYS_DIR/jwt.public.key" ]]  || { warn "Missing: $KEYS_DIR/jwt.public.key"; ERRORS=$((ERRORS+1)); }

  # Key strength
  if [[ -f "$KEYS_DIR/jwt.private.key" ]]; then
    KEY_BITS=$(openssl rsa -in "$KEYS_DIR/jwt.private.key" -text -noout 2>/dev/null | grep "Key:" | awk '{print $3}')
    [[ "$KEY_BITS" -ge 2048 ]] || { warn "JWT key is only $KEY_BITS bits — use 4096"; ERRORS=$((ERRORS+1)); }
  fi

  # Env vars
  source "$ENV_FILE" 2>/dev/null || true
  for VAR in DATABASE_ENCRYPTION_KEY HASH_SALT DB_PASSWORD REDIS_PASSWORD; do
    VALUE="${!VAR:-}"
    [[ -n "$VALUE" ]] || { warn "Missing env var: $VAR"; ERRORS=$((ERRORS+1)); }
  done

  # Encryption key length
  ENC_KEY="${DATABASE_ENCRYPTION_KEY:-}"
  [[ ${#ENC_KEY} -eq 64 ]] || { warn "DATABASE_ENCRYPTION_KEY must be 64 hex chars (is ${#ENC_KEY})"; ERRORS=$((ERRORS+1)); }

  HASH_SALT_VAL="${HASH_SALT:-}"
  [[ ${#HASH_SALT_VAL} -eq 64 ]] || { warn "HASH_SALT must be 64 hex chars (is ${#HASH_SALT_VAL})"; ERRORS=$((ERRORS+1)); }

  [[ "$ENC_KEY" != "$HASH_SALT_VAL" ]] || { warn "DATABASE_ENCRYPTION_KEY and HASH_SALT must be different!"; ERRORS=$((ERRORS+1)); }

  if [[ $ERRORS -eq 0 ]]; then
    info "✅ All secrets verified."
  else
    error "Found $ERRORS secret issue(s). Fix before deploying."
  fi
}

# ─── audit — Print secret metadata only ──────────────────────────────────────
cmd_audit() {
  info "Secret audit (metadata only — no values printed):"
  echo ""

  if [[ -f "$KEYS_DIR/jwt.private.key" ]]; then
    BITS=$(openssl rsa -in "$KEYS_DIR/jwt.private.key" -text -noout 2>/dev/null | grep "Key:" | awk '{print $3}')
    MOD=$(openssl rsa -in "$KEYS_DIR/jwt.private.key" -modulus -noout 2>/dev/null | openssl md5 | awk '{print $2}')
    echo "  JWT Private Key: ${BITS}-bit RSA | fingerprint: $MOD"
  else
    warn "  JWT Private Key: NOT FOUND"
  fi

  if [[ -f "$KEYS_DIR/jwt.public.key" ]]; then
    echo "  JWT Public Key:  $(stat -c%s "$KEYS_DIR/jwt.public.key") bytes"
  fi

  echo "  MySQL secrets dir: $(ls "$SECRETS_DIR"/*.txt 2>/dev/null | wc -l) file(s)"
  echo "  Backup count:      $(find "$SECRETS_DIR/backups" -name "*.bak" 2>/dev/null | wc -l) backup(s)"
}

# ─── Dispatch ─────────────────────────────────────────────────────────────────
check_deps
case "${1:-help}" in
  init)       cmd_init ;;
  rotate-jwt) cmd_rotate_jwt ;;
  verify)     cmd_verify ;;
  audit)      cmd_audit ;;
  *)
    echo "Usage: $0 {init|rotate-jwt|verify|audit}"
    exit 1
    ;;
esac
