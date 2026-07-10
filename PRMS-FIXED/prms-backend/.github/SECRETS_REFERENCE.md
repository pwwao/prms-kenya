# =============================================================================
# PRMS — Required GitHub Actions Secrets
# Configure these under: Settings → Secrets and variables → Actions
# =============================================================================

## ── AWS ──────────────────────────────────────────────────────────────────────
AWS_ACCOUNT_ID                   # 12-digit AWS account ID
AWS_ACCESS_KEY_ID                # IAM user access key (CI/CD role)
AWS_SECRET_ACCESS_KEY            # IAM user secret key
S3_BACKUP_BUCKET                 # e.g. prms-db-backups-prod

## ── SSH (Servers) ─────────────────────────────────────────────────────────────
PROD_HOST                        # Production server IP or hostname
PROD_SSH_KEY                     # Private SSH key for deploy@prod
STAGING_HOST                     # Staging server IP or hostname
STAGING_SSH_KEY                  # Private SSH key for deploy@staging

## ── Database ──────────────────────────────────────────────────────────────────
STAGING_DB_HOST
STAGING_DB_NAME
STAGING_DB_USER
STAGING_DB_PASSWORD

## ── Cryptographic secrets (test environment) ─────────────────────────────────
TEST_ENCRYPTION_KEY              # 64-char hex — for CI test DB encryption
TEST_HASH_SALT                   # 64-char hex — for CI test hashing
STAGING_ENCRYPTION_KEY           # 64-char hex — for staging
STAGING_HASH_SALT                # 64-char hex — for staging

## ── Notifications ────────────────────────────────────────────────────────────
SLACK_BOT_TOKEN                  # Slack Bot Token (xoxb-...)
SLACK_CHANNEL_ID                 # Default alert channel ID
SLACK_SECURITY_CHANNEL_ID        # Security-specific channel ID
PAGERDUTY_SERVICE_KEY            # PagerDuty integration key

## ── E2E Test Credentials (staging) ───────────────────────────────────────────
E2E_ADMIN_EMAIL
E2E_ADMIN_PASSWORD
E2E_CLINICIAN_EMAIL
E2E_CLINICIAN_PASSWORD
E2E_RECEPTIONIST_EMAIL
E2E_RECEPTIONIST_PASSWORD
E2E_TARGET_CLINICIAN_EMAIL
E2E_TARGET_CLINICIAN_PASSWORD

## ── GitHub Environments ───────────────────────────────────────────────────────
# Create two GitHub Environments (Settings → Environments):
#   1. "staging"    — no required reviewers, auto-deploy on push to develop
#   2. "production" — required reviewers (≥1 approver), deploy on push to main
#
# Set environment-specific secrets in each environment as needed.
