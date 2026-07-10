#!/usr/bin/env bash
# generate-keys.sh — generates RS256 key pair for JWT signing
# Architecture Contract §10.2 — RS256 asymmetric keys
# Run once per environment; store private key securely (never commit to git)

set -euo pipefail

KEYS_DIR="$(dirname "$0")/../keys"
mkdir -p "$KEYS_DIR"

PRIVATE_KEY="$KEYS_DIR/jwt.private.key"
PUBLIC_KEY="$KEYS_DIR/jwt.public.key"

if [[ -f "$PRIVATE_KEY" ]]; then
  echo "⚠️  Keys already exist at $KEYS_DIR — skipping generation."
  echo "   Delete them manually if you need to rotate."
  exit 0
fi

echo "🔑 Generating RS256 key pair..."

# Generate 4096-bit RSA private key (PEM format)
openssl genrsa -out "$PRIVATE_KEY" 4096 2>/dev/null

# Extract public key
openssl rsa -in "$PRIVATE_KEY" -pubout -out "$PUBLIC_KEY" 2>/dev/null

# Restrict permissions
chmod 600 "$PRIVATE_KEY"
chmod 644 "$PUBLIC_KEY"

echo "✅ Keys generated:"
echo "   Private: $PRIVATE_KEY (keep secret — never commit)"
echo "   Public:  $PUBLIC_KEY"
echo ""
echo "Add to .env:"
echo "  JWT_PRIVATE_KEY_PATH=./keys/jwt.private.key"
echo "  JWT_PUBLIC_KEY_PATH=./keys/jwt.public.key"
echo ""
echo "🔐 Generating AES-256-GCM encryption key and hash salt..."
echo ""
echo "Add these to .env (never commit):"
echo "  DATABASE_ENCRYPTION_KEY=$(openssl rand -hex 32)"
echo "  HASH_SALT=$(openssl rand -hex 32)"
