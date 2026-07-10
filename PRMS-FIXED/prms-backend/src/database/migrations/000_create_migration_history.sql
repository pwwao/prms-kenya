-- =============================================================================
-- PRMS — Patient Referral Management System (Kenya)
-- DATABASE MODULE: Complete Schema, Migrations, Indexes, Stored Procedures,
--                 Views, Reporting Tables, Audit Tables
-- Version:  1.0.0
-- Standard: Architecture Contract v1.0 §9 Database Standards / §16.2 ERD
-- Engine:   MySQL 8.0 InnoDB
-- Charset:  utf8mb4 / utf8mb4_unicode_ci
-- =============================================================================
-- ENCRYPTION STRATEGY:
--   Algorithm : AES-256-GCM (applied in application layer — crypto.service.ts)
--   PII columns: TEXT, stored as JSON {iv, authTag, content} (all hex)
--   Search    : HMAC-SHA256 hash in separate _hash column (blind-index lookup)
--   Keys      : DATABASE_ENCRYPTION_KEY (env, 64-char hex, 256-bit)
--               HASH_SALT               (env, 64-char hex, separate from enc key)
--   Key rotation: planned via migration — old ciphertext re-encrypted offline
--   Transport : TLS 1.3 enforced at Nginx layer — no plaintext in transit
-- =============================================================================
-- BACKUP STRATEGY:
--   Full backup  : daily, mysqldump --single-transaction --routines --triggers
--   Incremental  : binary log streaming to AWS S3 (point-in-time recovery)
--   Retention    : 30 days daily / 12 months monthly
--   Read replicas: 1 replica minimum; report queries directed to replica
--   Test restores: weekly restore drill to staging (automated via CI)
--   Encryption   : backups encrypted at rest (AWS S3 SSE-KMS)
-- =============================================================================
-- SCALING STRATEGY:
--   Connections  : Pool min=10 / max=50 per app node (see §9.1)
--   Read replicas: report & list queries routed via replica connection string
--   Partitioning : audit_logs and referral_logs by RANGE on YEAR(created_at)
--   Archiving    : rows older than 2 years moved to _archive tables via event
--   Sharding     : not required at launch; revisit at 10M referrals
--   ProxySQL     : recommended for read/write split at scale
-- =============================================================================
-- QUERY OPTIMISATION:
--   Prepared statements only (mysql2 execute()) — no string interpolation
--   All FK columns indexed
--   Blind-index (hash) columns for encrypted field lookups — unique indexes
--   Composite indexes on common filter combos (status+hospital, county+date)
--   EXPLAIN ANALYZE run on every query touching >1000 rows before merge
--   Queries joining >4 tables extracted to VIEWs (see §9.2)
--   Hot-path reads served from Redis cache (TTLs in §9.6)
--   OPTIMIZER_TRACE enabled in staging; hints added where needed
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 0. DATABASE BOOTSTRAP
-- ─────────────────────────────────────────────────────────────────────────────

CREATE DATABASE IF NOT EXISTS prms_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE prms_db;

-- Migration history — run once before any migration files
CREATE TABLE IF NOT EXISTS migration_history (
    id            INT            NOT NULL AUTO_INCREMENT,
    migration     VARCHAR(255)   NOT NULL,
    executed_at   TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    checksum      VARCHAR(64)    NOT NULL COMMENT 'SHA-256 of migration file content',
    PRIMARY KEY (id),
    UNIQUE KEY uq_migration_history_migration (migration)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Tracks applied migrations — never modify rows here';
