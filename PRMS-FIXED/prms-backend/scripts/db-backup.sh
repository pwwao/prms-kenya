#!/usr/bin/env bash
# =============================================================================
# PRMS — Database Backup & Restore
# Architecture Contract §15.3 — Daily backups, 30-day retention, S3 upload
# Usage:
#   ./db-backup.sh backup    — Full encrypted backup → S3
#   ./db-backup.sh restore <s3-key>  — Restore from S3
#   ./db-backup.sh list      — List available backups
# =============================================================================

set -euo pipefail

source /opt/prms/.env

BACKUP_DIR="/tmp/prms-backups"
S3_BUCKET="${S3_BACKUP_BUCKET:-prms-db-backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="prms_backup_${TIMESTAMP}.sql.gz.enc"
RETENTION_DAYS=30

info()  { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [INFO] $*"; }
error() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [ERROR] $*"; exit 1; }

mkdir -p "$BACKUP_DIR"

cmd_backup() {
  info "Starting database backup..."

  LOCAL_FILE="$BACKUP_DIR/$BACKUP_FILE"

  # Dump → gzip → AES-256-CBC encrypt (separate key from app encryption key)
  BACKUP_KEY=$(aws secretsmanager get-secret-value \
    --secret-id prms/backup-encryption-key \
    --query SecretString --output text)

  mysqldump \
    --host="$DB_HOST" \
    --user="$DB_USER" \
    --password="$DB_PASSWORD" \
    --single-transaction \
    --routines \
    --triggers \
    --events \
    --set-gtid-purged=OFF \
    "$DB_NAME" \
    | gzip \
    | openssl enc -aes-256-cbc -salt -pbkdf2 -pass "pass:$BACKUP_KEY" \
    > "$LOCAL_FILE"

  FILE_SIZE=$(du -sh "$LOCAL_FILE" | cut -f1)
  info "Backup created: $LOCAL_FILE ($FILE_SIZE)"

  # Upload to S3 with server-side encryption
  aws s3 cp "$LOCAL_FILE" \
    "s3://$S3_BUCKET/backups/$BACKUP_FILE" \
    --sse aws:kms \
    --storage-class STANDARD_IA

  info "✅ Backup uploaded: s3://$S3_BUCKET/backups/$BACKUP_FILE"

  # Clean up local file
  rm -f "$LOCAL_FILE"

  # Remove old backups from S3 (retention policy)
  info "Enforcing $RETENTION_DAYS-day retention..."
  CUTOFF=$(date -d "-${RETENTION_DAYS} days" +%Y-%m-%dT%H:%M:%S)
  aws s3api list-objects-v2 \
    --bucket "$S3_BUCKET" \
    --prefix "backups/" \
    --query "Contents[?LastModified<='$CUTOFF'].Key" \
    --output text \
  | tr '\t' '\n' \
  | while read -r KEY; do
      [[ -n "$KEY" ]] && aws s3 rm "s3://$S3_BUCKET/$KEY" && info "Deleted old backup: $KEY"
    done

  info "✅ Backup complete."
}

cmd_restore() {
  local S3_KEY="${1:-}"
  [[ -n "$S3_KEY" ]] || error "Usage: $0 restore <s3-object-key>"

  warn "⚠️  This will OVERWRITE the current database: $DB_NAME"
  read -rp "Type 'YES' to confirm: " CONFIRM
  [[ "$CONFIRM" == "YES" ]] || error "Restore cancelled."

  info "Downloading backup from S3..."
  LOCAL_FILE="$BACKUP_DIR/restore_$(date +%s).sql.gz.enc"
  aws s3 cp "s3://$S3_BUCKET/$S3_KEY" "$LOCAL_FILE"

  BACKUP_KEY=$(aws secretsmanager get-secret-value \
    --secret-id prms/backup-encryption-key \
    --query SecretString --output text)

  info "Decrypting and restoring..."
  openssl enc -d -aes-256-cbc -pbkdf2 -pass "pass:$BACKUP_KEY" < "$LOCAL_FILE" \
    | gunzip \
    | mysql --host="$DB_HOST" --user="$DB_USER" --password="$DB_PASSWORD" "$DB_NAME"

  rm -f "$LOCAL_FILE"
  info "✅ Restore complete."
}

cmd_list() {
  info "Available backups in s3://$S3_BUCKET/backups/:"
  aws s3 ls "s3://$S3_BUCKET/backups/" \
    --human-readable \
    --summarize \
    | sort -k1,2
}

case "${1:-}" in
  backup)           cmd_backup ;;
  restore)          cmd_restore "${2:-}" ;;
  list)             cmd_list ;;
  *)                echo "Usage: $0 {backup|restore <key>|list}"; exit 1 ;;
esac
