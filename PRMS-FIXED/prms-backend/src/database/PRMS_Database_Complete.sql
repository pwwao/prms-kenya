-- =============================================================================
-- NOTE FROM INTEGRATION TEAM (added, no SQL content below this point changed):
--
-- This is the original, complete schema file as submitted by the Database
-- team. It is kept here for reference and as a single-file option if you
-- want to run the whole schema in one shot against a fresh database.
--
-- The application's own migration runner (src/database/migrate.ts) does
-- NOT use this file directly — it reads the split, numbered files in
-- src/database/migrations/ (000 through 015), which were extracted from
-- this exact file with no content changes, only file boundaries added.
-- Use src/database/migrations/ for anything going through `npm run migrate`,
-- since that's what tracks applied migrations in migration_history.
--
-- Use THIS file directly only if you're not going through migrate.ts at
-- all — e.g. handing it to a DBA, or running it manually with
-- `mysql < PRMS_Database_Complete.sql` against a brand-new database.
-- Don't run both this file AND the migrations/ folder against the same
-- database — you'll get "already exists" errors on the second run.
-- =============================================================================

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


-- =============================================================================
-- MIGRATION 001 — CREATE hospitals
-- =============================================================================

CREATE TABLE IF NOT EXISTS hospitals (
    id             INT            NOT NULL AUTO_INCREMENT,
    moh_code       VARCHAR(20)    NOT NULL COMMENT 'Ministry of Health facility code',
    name           VARCHAR(255)   NOT NULL,
    facility_level ENUM(
        'Level 2',
        'Level 3',
        'Level 4',
        'Level 5',
        'Level 6'
    )              NOT NULL,
    county         VARCHAR(100)   NOT NULL,
    sub_county     VARCHAR(100)   NOT NULL,
    address        VARCHAR(500)   NULL,
    phone          VARCHAR(20)    NULL,
    email          VARCHAR(255)   NULL,
    status         ENUM(
        'Pending',
        'Approved',
        'Suspended'
    )              NOT NULL DEFAULT 'Pending',
    created_at     TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at     TIMESTAMP      NULL     DEFAULT NULL COMMENT 'Soft delete timestamp',

    PRIMARY KEY (id),
    UNIQUE KEY uq_hospitals_moh_code (moh_code),
    KEY idx_hospitals_status        (status),
    KEY idx_hospitals_county        (county),
    KEY idx_hospitals_county_status (county, status),
    KEY idx_hospitals_deleted_at    (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Healthcare facilities registered on the PRMS platform';

-- hospital_approvals — approval workflow history
CREATE TABLE IF NOT EXISTS hospital_approvals (
    id             INT            NOT NULL AUTO_INCREMENT,
    hospital_id    INT            NOT NULL,
    actioned_by    INT            NULL     COMMENT 'user_id of System Admin; NULL if system auto-action',
    previous_status ENUM('Pending','Approved','Suspended') NOT NULL,
    new_status      ENUM('Pending','Approved','Suspended') NOT NULL,
    reason         TEXT           NULL,
    actioned_at    TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    KEY idx_hospital_approvals_hospital_id (hospital_id),
    KEY idx_hospital_approvals_actioned_at (actioned_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Immutable approval/suspension trail for hospitals';


-- =============================================================================
-- MIGRATION 002 — CREATE users
-- =============================================================================

CREATE TABLE IF NOT EXISTS users (
    id                      INT            NOT NULL AUTO_INCREMENT,
    hospital_id             INT            NULL     COMMENT 'NULL for System Admin',
    username                VARCHAR(50)    NOT NULL,
    email                   VARCHAR(255)   NULL,
    password_hash           VARCHAR(255)   NOT NULL COMMENT 'bcrypt, work-factor 12',
    role                    ENUM(
        'System Admin',
        'Hospital Admin',
        'Clinician',
        'Receptionist'
    )                        NOT NULL,
    full_name_encrypted     TEXT           NULL     COMMENT 'AES-256-GCM JSON {iv,authTag,content}',
    phone_number            VARCHAR(20)    NULL     COMMENT 'Not PII; used for 2FA SMS OTP only',
    two_factor_secret       VARCHAR(255)   NULL     COMMENT 'TOTP base32 secret (stored encrypted in prod)',
    is_two_factor_enabled   TINYINT(1)     NOT NULL DEFAULT 0,
    status                  ENUM(
        'Active',
        'Inactive',
        'Suspended'
    )                        NOT NULL DEFAULT 'Active',
    last_login_at           TIMESTAMP      NULL     DEFAULT NULL,
    password_changed_at     TIMESTAMP      NULL     DEFAULT NULL,
    created_at              TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at              TIMESTAMP      NULL     DEFAULT NULL,

    PRIMARY KEY (id),
    UNIQUE KEY uq_users_username    (username),
    UNIQUE KEY uq_users_email       (email),
    KEY idx_users_hospital_id       (hospital_id),
    KEY idx_users_role              (role),
    KEY idx_users_status            (status),
    KEY idx_users_hospital_role     (hospital_id, role),
    KEY idx_users_hospital_status   (hospital_id, status),
    KEY idx_users_deleted_at        (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='All platform users — clinicians, admins, receptionists';

-- refresh_tokens — JWT refresh token registry
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id          INT            NOT NULL AUTO_INCREMENT,
    user_id     INT            NOT NULL,
    jti         VARCHAR(36)    NOT NULL COMMENT 'UUID v4 — matches JWT jti claim',
    expires_at  TIMESTAMP      NOT NULL,
    revoked_at  TIMESTAMP      NULL     DEFAULT NULL,
    device_id   VARCHAR(100)   NULL,
    created_at  TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_refresh_tokens_jti (jti),
    KEY idx_refresh_tokens_user_id   (user_id),
    KEY idx_refresh_tokens_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Persisted refresh token registry; enables revocation';

-- device_sessions — mobile FCM token registry
CREATE TABLE IF NOT EXISTS device_sessions (
    id            INT            NOT NULL AUTO_INCREMENT,
    user_id       INT            NOT NULL,
    device_id     VARCHAR(100)   NOT NULL,
    fcm_token     VARCHAR(500)   NULL     COMMENT 'Firebase Cloud Messaging registration token',
    platform      ENUM('android','ios','web') NOT NULL,
    last_seen_at  TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at    TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_device_sessions_user_device (user_id, device_id),
    KEY idx_device_sessions_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Mobile device sessions; stores FCM tokens per device';


-- =============================================================================
-- MIGRATION 003 — CREATE patients
-- =============================================================================

CREATE TABLE IF NOT EXISTS patients (
    id                      INT            NOT NULL AUTO_INCREMENT,
    -- PII columns — encrypted at application layer (AES-256-GCM)
    national_id_encrypted   TEXT           NULL     COMMENT 'AES-256-GCM JSON {iv,authTag,content}',
    national_id_hash        VARCHAR(64)    NULL     COMMENT 'HMAC-SHA256 blind-index for lookup',
    full_name_encrypted     TEXT           NOT NULL COMMENT 'AES-256-GCM JSON {iv,authTag,content}',
    full_name_hash          VARCHAR(64)    NULL     COMMENT 'HMAC-SHA256 of normalised full name',
    phone_encrypted         TEXT           NULL     COMMENT 'AES-256-GCM JSON {iv,authTag,content}',
    phone_hash              VARCHAR(64)    NULL     COMMENT 'HMAC-SHA256 of phone number for lookup',
    -- Non-PII demographic fields
    gender                  ENUM('Male','Female','Other','Prefer not to say')  NOT NULL,
    date_of_birth           DATE           NOT NULL,
    county                  VARCHAR(100)   NOT NULL,
    sub_county              VARCHAR(100)   NULL,
    next_of_kin_name        VARCHAR(255)   NULL     COMMENT 'Stored plain; not identity PII',
    next_of_kin_phone       VARCHAR(20)    NULL,
    registered_by_user_id   INT            NOT NULL COMMENT 'FK → users.id',
    registered_at_hospital_id INT          NOT NULL COMMENT 'FK → hospitals.id',
    created_at              TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_patients_national_id_hash   (national_id_hash),
    KEY idx_patients_full_name_hash           (full_name_hash),
    KEY idx_patients_phone_hash               (phone_hash),
    KEY idx_patients_registered_by_user_id    (registered_by_user_id),
    KEY idx_patients_registered_at_hospital_id (registered_at_hospital_id),
    KEY idx_patients_county                   (county),
    KEY idx_patients_dob                      (date_of_birth),
    KEY idx_patients_gender_county            (gender, county)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Patient records — PII encrypted at rest using AES-256-GCM';


-- =============================================================================
-- MIGRATION 004 — CREATE referrals
-- =============================================================================

CREATE TABLE IF NOT EXISTS referrals (
    id                          INT            NOT NULL AUTO_INCREMENT,
    referral_code               VARCHAR(30)    NOT NULL COMMENT 'e.g. REF-2026-00001',
    patient_id                  INT            NOT NULL,
    source_hospital_id          INT            NOT NULL,
    destination_hospital_id     INT            NOT NULL,
    created_by_user_id          INT            NOT NULL,
    urgency_level               ENUM(
        'Routine',
        'Urgent',
        'Emergent'
    )                           NOT NULL DEFAULT 'Routine',
    -- Clinical data — encrypted at application layer
    clinical_summary_encrypted  TEXT           NULL     COMMENT 'AES-256-GCM JSON {iv,authTag,content}',
    reason_for_referral         TEXT           NOT NULL COMMENT 'Non-sensitive; not encrypted',
    current_status              ENUM(
        'Draft',
        'Dispatched',
        'Received',
        'Accepted',
        'Rejected',
        'Completed'
    )                           NOT NULL DEFAULT 'Draft',
    rejection_reason            TEXT           NULL     COMMENT 'Required when status = Rejected',
    received_by_user_id         INT            NULL     COMMENT 'FK → users.id — set when Received',
    accepted_rejected_by_user_id INT           NULL     COMMENT 'FK → users.id — set when Accepted/Rejected',
    dispatched_at               TIMESTAMP      NULL,
    received_at                 TIMESTAMP      NULL,
    accepted_at                 TIMESTAMP      NULL,
    rejected_at                 TIMESTAMP      NULL,
    completed_at                TIMESTAMP      NULL,
    created_at                  TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_referrals_referral_code         (referral_code),
    KEY idx_referrals_patient_id                  (patient_id),
    KEY idx_referrals_source_hospital_id          (source_hospital_id),
    KEY idx_referrals_destination_hospital_id     (destination_hospital_id),
    KEY idx_referrals_created_by_user_id          (created_by_user_id),
    KEY idx_referrals_current_status              (current_status),
    KEY idx_referrals_urgency_level               (urgency_level),
    -- Composite indexes for common dashboard queries
    KEY idx_referrals_source_status               (source_hospital_id, current_status),
    KEY idx_referrals_destination_status          (destination_hospital_id, current_status),
    KEY idx_referrals_status_urgency              (current_status, urgency_level),
    KEY idx_referrals_source_created_at           (source_hospital_id, created_at),
    KEY idx_referrals_destination_created_at      (destination_hospital_id, created_at),
    KEY idx_referrals_patient_status              (patient_id, current_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Core referral records — implements 6-state machine per architecture contract';

-- referral_attachments — optional supporting documents per referral
CREATE TABLE IF NOT EXISTS referral_attachments (
    id               INT            NOT NULL AUTO_INCREMENT,
    referral_id      INT            NOT NULL,
    uploaded_by_user_id INT         NOT NULL,
    file_name        VARCHAR(255)   NOT NULL,
    file_size_bytes  INT            NOT NULL,
    mime_type        VARCHAR(100)   NOT NULL,
    storage_path     VARCHAR(1000)  NOT NULL COMMENT 'S3 key or filesystem path — never a URL',
    is_encrypted     TINYINT(1)     NOT NULL DEFAULT 1,
    created_at       TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    KEY idx_referral_attachments_referral_id      (referral_id),
    KEY idx_referral_attachments_uploaded_by      (uploaded_by_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='File attachments linked to a referral (lab results, imaging, etc.)';


-- =============================================================================
-- MIGRATION 005 — CREATE referral_logs
-- =============================================================================

CREATE TABLE IF NOT EXISTS referral_logs (
    id                  INT            NOT NULL AUTO_INCREMENT,
    referral_id         INT            NOT NULL,
    action_by_user_id   INT            NOT NULL,
    previous_status     ENUM(
        'Draft','Dispatched','Received','Accepted','Rejected','Completed'
    )                   NULL           COMMENT 'NULL on initial Draft creation',
    new_status          ENUM(
        'Draft','Dispatched','Received','Accepted','Rejected','Completed'
    )                   NOT NULL,
    notes               TEXT           NULL,
    ip_address          VARCHAR(45)    NULL     COMMENT 'IPv4 or IPv6',
    logged_at           TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    KEY idx_referral_logs_referral_id       (referral_id),
    KEY idx_referral_logs_action_by_user_id (action_by_user_id),
    KEY idx_referral_logs_logged_at         (logged_at),
    KEY idx_referral_logs_new_status        (new_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Immutable state-transition log for every referral status change'
  -- PARTITIONING: add RANGE on YEAR(logged_at) when row count >5M
  ;


-- =============================================================================
-- MIGRATION 006 — CREATE messages
-- =============================================================================

CREATE TABLE IF NOT EXISTS messages (
    id                      INT            NOT NULL AUTO_INCREMENT,
    referral_id             INT            NOT NULL,
    sender_id               INT            NOT NULL COMMENT 'FK → users.id',
    message_text_encrypted  TEXT           NOT NULL COMMENT 'AES-256-GCM JSON {iv,authTag,content}',
    is_read                 TINYINT(1)     NOT NULL DEFAULT 0,
    created_at              TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    KEY idx_messages_referral_id   (referral_id),
    KEY idx_messages_sender_id     (sender_id),
    KEY idx_messages_created_at    (created_at),
    KEY idx_messages_referral_read (referral_id, is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Chat messages scoped to a single referral; content encrypted';

-- message_read_receipts — multi-recipient read tracking
CREATE TABLE IF NOT EXISTS message_read_receipts (
    id          INT            NOT NULL AUTO_INCREMENT,
    message_id  INT            NOT NULL,
    user_id     INT            NOT NULL,
    read_at     TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_message_read_receipts (message_id, user_id),
    KEY idx_message_read_receipts_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Per-user read receipts for referral chat messages';


-- =============================================================================
-- MIGRATION 007 — CREATE notifications
-- =============================================================================

CREATE TABLE IF NOT EXISTS notifications (
    id            INT            NOT NULL AUTO_INCREMENT,
    user_id       INT            NOT NULL,
    type          VARCHAR(100)   NOT NULL COMMENT 'e.g. REFERRAL_DISPATCHED, REFERRAL_ACCEPTED',
    title         VARCHAR(255)   NOT NULL,
    body          TEXT           NOT NULL,
    payload_json  TEXT           NULL     COMMENT 'JSON: {referralId, etc.} — not PII',
    channel       ENUM('in_app','push','sms','email') NOT NULL DEFAULT 'in_app',
    is_read       TINYINT(1)     NOT NULL DEFAULT 0,
    created_at    TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    KEY idx_notifications_user_id           (user_id),
    KEY idx_notifications_type              (type),
    KEY idx_notifications_user_read         (user_id, is_read),
    KEY idx_notifications_created_at        (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='In-app notification inbox per user';

-- notification_logs — delivery status per channel per attempt
CREATE TABLE IF NOT EXISTS notification_logs (
    id              INT            NOT NULL AUTO_INCREMENT,
    notification_id INT            NOT NULL,
    channel         ENUM('in_app','push','sms','email') NOT NULL,
    status          ENUM('queued','sent','delivered','failed') NOT NULL DEFAULT 'queued',
    attempt_number  TINYINT        NOT NULL DEFAULT 1,
    provider_ref    VARCHAR(255)   NULL     COMMENT 'FCM message ID, AT ref, SES message ID',
    error_message   TEXT           NULL,
    attempted_at    TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    KEY idx_notification_logs_notification_id (notification_id),
    KEY idx_notification_logs_status          (status),
    KEY idx_notification_logs_channel_status  (channel, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Delivery attempt log for all notification channels';


-- =============================================================================
-- MIGRATION 008 — CREATE audit_logs
-- =============================================================================

-- audit_logs is write-once — no UPDATE, no DELETE (enforced via TRIGGER below)
CREATE TABLE IF NOT EXISTS audit_logs (
    id                 BIGINT         NOT NULL AUTO_INCREMENT,
    user_id            INT            NULL     COMMENT 'NULL for system-initiated events',
    action_type        VARCHAR(100)   NOT NULL COMMENT 'e.g. LOGIN, CREATE_REFERRAL, UPDATE_STATUS',
    ip_address         VARCHAR(45)    NULL,
    user_agent         VARCHAR(500)   NULL,
    resource_type      VARCHAR(100)   NULL     COMMENT 'e.g. referral, patient, user',
    resource_id        INT            NULL     COMMENT 'PK of the affected resource',
    resource_affected  VARCHAR(255)   NULL     COMMENT 'Human-readable descriptor',
    payload_snapshot   MEDIUMTEXT     NULL     COMMENT 'JSON diff or request body snapshot — no PII plaintext',
    hospital_id        INT            NULL     COMMENT 'Denormalised for fast audit filtering by facility',
    created_at         TIMESTAMP(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT 'Microsecond precision',

    PRIMARY KEY (id),
    KEY idx_audit_logs_user_id       (user_id),
    KEY idx_audit_logs_action_type   (action_type),
    KEY idx_audit_logs_created_at    (created_at),
    KEY idx_audit_logs_resource      (resource_type, resource_id),
    KEY idx_audit_logs_hospital_id   (hospital_id),
    -- Composite: admin dashboard "show all actions by this user in this hospital"
    KEY idx_audit_logs_hospital_user (hospital_id, user_id),
    KEY idx_audit_logs_hospital_date (hospital_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Immutable audit trail — write-once enforced by trigger. Never modify.'
  -- PARTITIONING recommendation (apply when row count >10M):
  -- PARTITION BY RANGE (YEAR(created_at)) (
  --   PARTITION p2026 VALUES LESS THAN (2027),
  --   PARTITION p2027 VALUES LESS THAN (2028),
  --   PARTITION p_future VALUES LESS THAN MAXVALUE
  -- );
  ;


-- =============================================================================
-- FOREIGN KEY CONSTRAINTS
-- Added after all tables exist to avoid ordering issues
-- =============================================================================

-- hospital_approvals
ALTER TABLE hospital_approvals
    ADD CONSTRAINT fk_hospital_approvals_hospitals
        FOREIGN KEY (hospital_id) REFERENCES hospitals (id)
        ON DELETE RESTRICT ON UPDATE CASCADE;

-- users
ALTER TABLE users
    ADD CONSTRAINT fk_users_hospitals
        FOREIGN KEY (hospital_id) REFERENCES hospitals (id)
        ON DELETE RESTRICT ON UPDATE CASCADE;

-- refresh_tokens
ALTER TABLE refresh_tokens
    ADD CONSTRAINT fk_refresh_tokens_users
        FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE CASCADE ON UPDATE CASCADE;

-- device_sessions
ALTER TABLE device_sessions
    ADD CONSTRAINT fk_device_sessions_users
        FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE CASCADE ON UPDATE CASCADE;

-- patients
ALTER TABLE patients
    ADD CONSTRAINT fk_patients_users
        FOREIGN KEY (registered_by_user_id) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT fk_patients_hospitals
        FOREIGN KEY (registered_at_hospital_id) REFERENCES hospitals (id)
        ON DELETE RESTRICT ON UPDATE CASCADE;

-- referrals
-- NOTE (fixed during setup): source_hospital_id and destination_hospital_id
-- use ON UPDATE RESTRICT, not CASCADE. MySQL 8 disallows a column being
-- part of both a CHECK constraint and a foreign key with CASCADE/SET NULL
-- referential actions (see chk_referrals_different_hospitals below) — the
-- original CASCADE caused: "Column 'destination_hospital_id' cannot be
-- used in a check constraint ... needed in a foreign key constraint
-- referential action." RESTRICT is also the more correct choice here
-- regardless, since hospital IDs are not expected to change once created.
ALTER TABLE referrals
    ADD CONSTRAINT fk_referrals_patients
        FOREIGN KEY (patient_id) REFERENCES patients (id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT fk_referrals_source_hospitals
        FOREIGN KEY (source_hospital_id) REFERENCES hospitals (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    ADD CONSTRAINT fk_referrals_destination_hospitals
        FOREIGN KEY (destination_hospital_id) REFERENCES hospitals (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    ADD CONSTRAINT fk_referrals_created_by_users
        FOREIGN KEY (created_by_user_id) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT fk_referrals_received_by_users
        FOREIGN KEY (received_by_user_id) REFERENCES users (id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT fk_referrals_accepted_rejected_by_users
        FOREIGN KEY (accepted_rejected_by_user_id) REFERENCES users (id)
        ON DELETE SET NULL ON UPDATE CASCADE;

-- referral_attachments
ALTER TABLE referral_attachments
    ADD CONSTRAINT fk_referral_attachments_referrals
        FOREIGN KEY (referral_id) REFERENCES referrals (id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT fk_referral_attachments_users
        FOREIGN KEY (uploaded_by_user_id) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE CASCADE;

-- referral_logs
ALTER TABLE referral_logs
    ADD CONSTRAINT fk_referral_logs_referrals
        FOREIGN KEY (referral_id) REFERENCES referrals (id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT fk_referral_logs_users
        FOREIGN KEY (action_by_user_id) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE CASCADE;

-- messages
ALTER TABLE messages
    ADD CONSTRAINT fk_messages_referrals
        FOREIGN KEY (referral_id) REFERENCES referrals (id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT fk_messages_users
        FOREIGN KEY (sender_id) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE CASCADE;

-- message_read_receipts
ALTER TABLE message_read_receipts
    ADD CONSTRAINT fk_message_read_receipts_messages
        FOREIGN KEY (message_id) REFERENCES messages (id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT fk_message_read_receipts_users
        FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE CASCADE ON UPDATE CASCADE;

-- notifications
ALTER TABLE notifications
    ADD CONSTRAINT fk_notifications_users
        FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE CASCADE ON UPDATE CASCADE;

-- notification_logs
ALTER TABLE notification_logs
    ADD CONSTRAINT fk_notification_logs_notifications
        FOREIGN KEY (notification_id) REFERENCES notifications (id)
        ON DELETE CASCADE ON UPDATE CASCADE;

-- audit_logs
ALTER TABLE audit_logs
    ADD CONSTRAINT fk_audit_logs_users
        FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE SET NULL ON UPDATE CASCADE;


-- =============================================================================
-- CHECK CONSTRAINTS (MySQL 8.0.16+)
-- =============================================================================

ALTER TABLE referrals
    ADD CONSTRAINT chk_referrals_different_hospitals
        CHECK (source_hospital_id <> destination_hospital_id),
    ADD CONSTRAINT chk_referrals_rejection_reason
        CHECK (
            current_status != 'Rejected' OR rejection_reason IS NOT NULL
        );

ALTER TABLE referral_logs
    ADD CONSTRAINT chk_referral_logs_status_change
        CHECK (previous_status IS NULL OR previous_status <> new_status);

ALTER TABLE notification_logs
    ADD CONSTRAINT chk_notification_logs_attempt
        CHECK (attempt_number BETWEEN 1 AND 3);

ALTER TABLE hospital_approvals
    ADD CONSTRAINT chk_hospital_approvals_status_change
        CHECK (previous_status <> new_status);


-- =============================================================================
-- TRIGGERS — IMMUTABILITY & INTEGRITY
-- =============================================================================

DELIMITER $$

-- audit_logs: block UPDATE
CREATE TRIGGER trg_audit_logs_no_update
    BEFORE UPDATE ON audit_logs
    FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'audit_logs rows are immutable — UPDATE not permitted';
END$$

-- audit_logs: block DELETE
CREATE TRIGGER trg_audit_logs_no_delete
    BEFORE DELETE ON audit_logs
    FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'audit_logs rows are immutable — DELETE not permitted';
END$$

-- referral_logs: block UPDATE
CREATE TRIGGER trg_referral_logs_no_update
    BEFORE UPDATE ON referral_logs
    FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'referral_logs rows are immutable — UPDATE not permitted';
END$$

-- referral_logs: block DELETE
CREATE TRIGGER trg_referral_logs_no_delete
    BEFORE DELETE ON referral_logs
    FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'referral_logs rows are immutable — DELETE not permitted';
END$$

-- referrals: auto-generate referral_code on INSERT
CREATE TRIGGER trg_referrals_generate_code
    BEFORE INSERT ON referrals
    FOR EACH ROW
BEGIN
    -- Format: REF-YYYY-NNNNN (zero-padded to 5 digits within the year)
    -- Application layer can override if it generates its own code first
    IF NEW.referral_code IS NULL OR NEW.referral_code = '' THEN
        SET NEW.referral_code = CONCAT(
            'REF-',
            YEAR(NOW()),
            '-',
            LPAD(
                (SELECT COALESCE(MAX(id), 0) + 1 FROM referrals),
                5, '0'
            )
        );
    END IF;
END$$

-- referrals: stamp timestamp columns on status transitions
CREATE TRIGGER trg_referrals_status_timestamps
    BEFORE UPDATE ON referrals
    FOR EACH ROW
BEGIN
    IF NEW.current_status <> OLD.current_status THEN
        CASE NEW.current_status
            WHEN 'Dispatched' THEN SET NEW.dispatched_at = NOW();
            WHEN 'Received'   THEN SET NEW.received_at   = NOW();
            WHEN 'Accepted'   THEN SET NEW.accepted_at   = NOW();
            WHEN 'Rejected'   THEN SET NEW.rejected_at   = NOW();
            WHEN 'Completed'  THEN SET NEW.completed_at  = NOW();
            ELSE BEGIN END;
        END CASE;
    END IF;
END$$

DELIMITER ;


-- =============================================================================
-- STORED PROCEDURES
-- =============================================================================

DELIMITER $$

-- ─────────────────────────────────────────────────────────────────────────────
-- sp_transition_referral_status
-- Called by Referral Service to atomically transition status and log the change.
-- Enforces the state machine defined in Architecture Contract §2.3.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE PROCEDURE sp_transition_referral_status (
    IN  p_referral_id       INT,
    IN  p_new_status        VARCHAR(20),
    IN  p_action_by_user_id INT,
    IN  p_notes             TEXT,
    IN  p_rejection_reason  TEXT,
    IN  p_ip_address        VARCHAR(45),
    OUT p_success           TINYINT,
    OUT p_error_message     VARCHAR(255)
)
BEGIN
    DECLARE v_current_status    VARCHAR(20);
    DECLARE v_transition_valid  TINYINT DEFAULT 0;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_success = 0;
        SET p_error_message = 'Transaction error during status transition';
    END;

    START TRANSACTION;

    -- Lock the referral row for the duration of the transaction
    SELECT current_status INTO v_current_status
    FROM referrals
    WHERE id = p_referral_id
    FOR UPDATE;

    IF v_current_status IS NULL THEN
        SET p_success = 0;
        SET p_error_message = 'Referral not found';
        ROLLBACK;
        LEAVE sp_transition_referral_status;
    END IF;

    -- Validate allowed transitions (mirrors §2.3 state machine)
    SET v_transition_valid = CASE
        WHEN v_current_status = 'Draft'      AND p_new_status = 'Dispatched' THEN 1
        WHEN v_current_status = 'Dispatched' AND p_new_status = 'Received'   THEN 1
        WHEN v_current_status = 'Dispatched' AND p_new_status = 'Draft'      THEN 1 -- recalled
        WHEN v_current_status = 'Received'   AND p_new_status = 'Accepted'   THEN 1
        WHEN v_current_status = 'Received'   AND p_new_status = 'Rejected'   THEN 1
        WHEN v_current_status = 'Accepted'   AND p_new_status = 'Completed'  THEN 1
        WHEN v_current_status = 'Accepted'   AND p_new_status = 'Rejected'   THEN 1
        WHEN v_current_status = 'Rejected'   AND p_new_status = 'Draft'      THEN 1 -- resubmit
        ELSE 0
    END;

    IF v_transition_valid = 0 THEN
        SET p_success = 0;
        SET p_error_message = CONCAT(
            'Invalid transition: ', v_current_status, ' → ', p_new_status
        );
        ROLLBACK;
        LEAVE sp_transition_referral_status;
    END IF;

    -- Require rejection_reason when rejecting
    IF p_new_status = 'Rejected' AND (p_rejection_reason IS NULL OR p_rejection_reason = '') THEN
        SET p_success = 0;
        SET p_error_message = 'rejection_reason is required when status is Rejected';
        ROLLBACK;
        LEAVE sp_transition_referral_status;
    END IF;

    -- Apply the status update
    UPDATE referrals
    SET
        current_status       = p_new_status,
        rejection_reason     = IF(p_new_status = 'Rejected', p_rejection_reason, rejection_reason),
        updated_at           = NOW()
    WHERE id = p_referral_id;

    -- Write the immutable log entry
    INSERT INTO referral_logs (
        referral_id,
        action_by_user_id,
        previous_status,
        new_status,
        notes,
        ip_address,
        logged_at
    ) VALUES (
        p_referral_id,
        p_action_by_user_id,
        v_current_status,
        p_new_status,
        p_notes,
        p_ip_address,
        NOW()
    );

    COMMIT;
    SET p_success = 1;
    SET p_error_message = NULL;
END$$

-- ─────────────────────────────────────────────────────────────────────────────
-- sp_create_audit_log
-- Called by backend audit middleware (async, non-blocking path).
-- Inserts a single row into audit_logs.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE PROCEDURE sp_create_audit_log (
    IN p_user_id           INT,
    IN p_action_type       VARCHAR(100),
    IN p_ip_address        VARCHAR(45),
    IN p_user_agent        VARCHAR(500),
    IN p_resource_type     VARCHAR(100),
    IN p_resource_id       INT,
    IN p_resource_affected VARCHAR(255),
    IN p_payload_snapshot  MEDIUMTEXT,
    IN p_hospital_id       INT
)
BEGIN
    INSERT INTO audit_logs (
        user_id,
        action_type,
        ip_address,
        user_agent,
        resource_type,
        resource_id,
        resource_affected,
        payload_snapshot,
        hospital_id,
        created_at
    ) VALUES (
        p_user_id,
        p_action_type,
        p_ip_address,
        p_user_agent,
        p_resource_type,
        p_resource_id,
        p_resource_affected,
        p_payload_snapshot,
        p_hospital_id,
        NOW(6)
    );
END$$

-- ─────────────────────────────────────────────────────────────────────────────
-- sp_get_referral_dashboard
-- Returns summary counts for a hospital's referral dashboard.
-- Used by the web and mobile dashboard endpoints.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE PROCEDURE sp_get_referral_dashboard (
    IN p_hospital_id INT
)
BEGIN
    SELECT
        SUM(CASE WHEN current_status = 'Draft'      THEN 1 ELSE 0 END) AS drafts,
        SUM(CASE WHEN current_status = 'Dispatched' THEN 1 ELSE 0 END) AS dispatched,
        SUM(CASE WHEN current_status = 'Received'   THEN 1 ELSE 0 END) AS received,
        SUM(CASE WHEN current_status = 'Accepted'   THEN 1 ELSE 0 END) AS accepted,
        SUM(CASE WHEN current_status = 'Rejected'   THEN 1 ELSE 0 END) AS rejected,
        SUM(CASE WHEN current_status = 'Completed'  THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN urgency_level  = 'Emergent'
                 AND current_status NOT IN ('Completed','Rejected')
            THEN 1 ELSE 0 END)                                          AS open_emergent,
        COUNT(*)                                                         AS total
    FROM referrals
    WHERE source_hospital_id = p_hospital_id
       OR destination_hospital_id = p_hospital_id;
END$$

-- ─────────────────────────────────────────────────────────────────────────────
-- sp_get_patient_referral_history
-- Returns all referrals for a patient (ordered newest first).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE PROCEDURE sp_get_patient_referral_history (
    IN p_patient_id INT
)
BEGIN
    SELECT
        r.id,
        r.referral_code,
        r.urgency_level,
        r.current_status,
        r.created_at,
        r.updated_at,
        hs.name  AS source_hospital_name,
        hd.name  AS destination_hospital_name
    FROM referrals r
    INNER JOIN hospitals hs ON hs.id = r.source_hospital_id
    INNER JOIN hospitals hd ON hd.id = r.destination_hospital_id
    WHERE r.patient_id = p_patient_id
    ORDER BY r.created_at DESC;
END$$

-- ─────────────────────────────────────────────────────────────────────────────
-- sp_mark_notifications_read
-- Bulk-marks all unread notifications for a user as read.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE PROCEDURE sp_mark_notifications_read (
    IN p_user_id INT
)
BEGIN
    UPDATE notifications
    SET is_read = 1
    WHERE user_id = p_user_id
      AND is_read = 0;

    SELECT ROW_COUNT() AS rows_updated;
END$$

-- ─────────────────────────────────────────────────────────────────────────────
-- sp_purge_expired_refresh_tokens
-- Scheduled cleanup — removes revoked or expired tokens.
-- Intended to be called by a nightly cron / BullMQ scheduled job.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE PROCEDURE sp_purge_expired_refresh_tokens ()
BEGIN
    DELETE FROM refresh_tokens
    WHERE expires_at < NOW()
       OR revoked_at IS NOT NULL;

    SELECT ROW_COUNT() AS rows_deleted;
END$$

-- ─────────────────────────────────────────────────────────────────────────────
-- sp_get_county_report
-- Aggregates referral counts by county for the System Admin analytics endpoint.
-- Targets: GET /api/v1/reports/county
-- NOTE: runs on read replica; no writes.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE PROCEDURE sp_get_county_report (
    IN p_from_date DATE,
    IN p_to_date   DATE
)
BEGIN
    SELECT
        h.county,
        COUNT(r.id)                                                      AS total_referrals,
        SUM(CASE WHEN r.current_status = 'Completed' THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN r.current_status = 'Rejected'  THEN 1 ELSE 0 END) AS rejected,
        SUM(CASE WHEN r.urgency_level  = 'Emergent'  THEN 1 ELSE 0 END) AS emergent,
        SUM(CASE WHEN r.urgency_level  = 'Urgent'    THEN 1 ELSE 0 END) AS urgent,
        SUM(CASE WHEN r.urgency_level  = 'Routine'   THEN 1 ELSE 0 END) AS routine,
        ROUND(
            AVG(
                CASE WHEN r.completed_at IS NOT NULL AND r.dispatched_at IS NOT NULL
                THEN TIMESTAMPDIFF(MINUTE, r.dispatched_at, r.completed_at)
                END
            ), 2
        )                                                                 AS avg_completion_minutes
    FROM referrals r
    INNER JOIN hospitals h ON h.id = r.source_hospital_id
    WHERE r.created_at BETWEEN p_from_date AND DATE_ADD(p_to_date, INTERVAL 1 DAY)
    GROUP BY h.county
    ORDER BY total_referrals DESC;
END$$

-- ─────────────────────────────────────────────────────────────────────────────
-- sp_get_facility_performance
-- Per-facility KPIs for Hospital Admin and System Admin.
-- Targets: GET /api/v1/reports/facility-performance
-- ─────────────────────────────────────────────────────────────────────────────
CREATE PROCEDURE sp_get_facility_performance (
    IN p_hospital_id INT,    -- NULL = all facilities (System Admin)
    IN p_from_date   DATE,
    IN p_to_date     DATE
)
BEGIN
    SELECT
        h.id                                                             AS hospital_id,
        h.name                                                           AS hospital_name,
        h.county,
        h.facility_level,
        COUNT(DISTINCT r_out.id)                                         AS outgoing_referrals,
        COUNT(DISTINCT r_in.id)                                          AS incoming_referrals,
        SUM(CASE WHEN r_out.current_status = 'Completed' THEN 1 ELSE 0 END) AS completed_outgoing,
        SUM(CASE WHEN r_in.current_status  = 'Rejected'  THEN 1 ELSE 0 END) AS rejections_incoming,
        ROUND(
            AVG(
                CASE WHEN r_in.accepted_at IS NOT NULL AND r_in.received_at IS NOT NULL
                THEN TIMESTAMPDIFF(MINUTE, r_in.received_at, r_in.accepted_at)
                END
            ), 2
        )                                                                 AS avg_accept_time_minutes
    FROM hospitals h
    LEFT JOIN referrals r_out ON r_out.source_hospital_id      = h.id
         AND r_out.created_at BETWEEN p_from_date AND DATE_ADD(p_to_date, INTERVAL 1 DAY)
    LEFT JOIN referrals r_in  ON r_in.destination_hospital_id  = h.id
         AND r_in.created_at  BETWEEN p_from_date AND DATE_ADD(p_to_date, INTERVAL 1 DAY)
    WHERE h.status = 'Approved'
      AND (p_hospital_id IS NULL OR h.id = p_hospital_id)
    GROUP BY h.id, h.name, h.county, h.facility_level
    ORDER BY outgoing_referrals DESC;
END$$

DELIMITER ;


-- =============================================================================
-- VIEWS
-- (Queries joining >4 tables extracted to views per §9.2)
-- All views are read-only; Report Service uses these exclusively.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- vw_referral_full
-- Complete denormalised referral record for list and detail endpoints.
-- Joins: referrals, patients, hospitals (×2), users (×3)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW vw_referral_full AS
SELECT
    r.id                            AS referral_id,
    r.referral_code,
    r.urgency_level,
    r.current_status,
    r.reason_for_referral,
    r.clinical_summary_encrypted,   -- decrypted in service layer
    r.rejection_reason,
    r.created_at                    AS referral_created_at,
    r.updated_at                    AS referral_updated_at,
    r.dispatched_at,
    r.received_at,
    r.accepted_at,
    r.rejected_at,
    r.completed_at,
    -- patient
    r.patient_id,
    p.gender                        AS patient_gender,
    p.date_of_birth                 AS patient_dob,
    p.county                        AS patient_county,
    p.full_name_encrypted           AS patient_name_encrypted,  -- decrypted in service
    p.national_id_encrypted         AS patient_nid_encrypted,
    p.phone_encrypted               AS patient_phone_encrypted,
    -- source hospital
    r.source_hospital_id,
    hs.name                         AS source_hospital_name,
    hs.county                       AS source_hospital_county,
    hs.facility_level               AS source_facility_level,
    -- destination hospital
    r.destination_hospital_id,
    hd.name                         AS destination_hospital_name,
    hd.county                       AS destination_hospital_county,
    hd.facility_level               AS destination_facility_level,
    -- created by
    r.created_by_user_id,
    uc.username                     AS created_by_username,
    uc.role                         AS created_by_role,
    -- received by
    r.received_by_user_id,
    ur.username                     AS received_by_username,
    -- accepted/rejected by
    r.accepted_rejected_by_user_id,
    ua.username                     AS accepted_rejected_by_username
FROM referrals r
INNER JOIN patients  p  ON p.id  = r.patient_id
INNER JOIN hospitals hs ON hs.id = r.source_hospital_id
INNER JOIN hospitals hd ON hd.id = r.destination_hospital_id
INNER JOIN users     uc ON uc.id = r.created_by_user_id
LEFT  JOIN users     ur ON ur.id = r.received_by_user_id
LEFT  JOIN users     ua ON ua.id = r.accepted_rejected_by_user_id;

-- ─────────────────────────────────────────────────────────────────────────────
-- vw_referral_timeline
-- Ordered log entries for the referral detail timeline view.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW vw_referral_timeline AS
SELECT
    rl.id               AS log_id,
    rl.referral_id,
    r.referral_code,
    rl.previous_status,
    rl.new_status,
    rl.notes,
    rl.logged_at,
    u.id                AS actor_user_id,
    u.username          AS actor_username,
    u.role              AS actor_role,
    h.name              AS actor_hospital_name
FROM referral_logs rl
INNER JOIN referrals r ON r.id = rl.referral_id
INNER JOIN users     u ON u.id = rl.action_by_user_id
LEFT  JOIN hospitals h ON h.id = u.hospital_id
ORDER BY rl.logged_at ASC;

-- ─────────────────────────────────────────────────────────────────────────────
-- vw_hospital_users_summary
-- List of users per hospital with last-login, used by Hospital Admin.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW vw_hospital_users_summary AS
SELECT
    u.id,
    u.hospital_id,
    h.name       AS hospital_name,
    u.username,
    u.email,
    u.role,
    u.status,
    u.is_two_factor_enabled,
    u.last_login_at,
    u.created_at
FROM users u
INNER JOIN hospitals h ON h.id = u.hospital_id
WHERE u.deleted_at IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- vw_notification_inbox
-- User notification inbox with unread count; used by notification list endpoint.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW vw_notification_inbox AS
SELECT
    n.id,
    n.user_id,
    u.username,
    n.type,
    n.title,
    n.body,
    n.payload_json,
    n.channel,
    n.is_read,
    n.created_at
FROM notifications n
INNER JOIN users u ON u.id = n.user_id
WHERE u.deleted_at IS NULL
ORDER BY n.created_at DESC;

-- ─────────────────────────────────────────────────────────────────────────────
-- vw_audit_log_detail
-- Audit log with user and hospital context; used by System Admin audit trail.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW vw_audit_log_detail AS
SELECT
    al.id,
    al.created_at,
    al.action_type,
    al.resource_type,
    al.resource_id,
    al.resource_affected,
    al.ip_address,
    al.user_agent,
    al.payload_snapshot,
    u.id            AS user_id,
    u.username,
    u.role          AS user_role,
    h.id            AS hospital_id,
    h.name          AS hospital_name,
    h.county        AS hospital_county
FROM audit_logs al
LEFT  JOIN users     u ON u.id = al.user_id
LEFT  JOIN hospitals h ON h.id = al.hospital_id
ORDER BY al.created_at DESC;

-- ─────────────────────────────────────────────────────────────────────────────
-- vw_referral_trends_monthly
-- Monthly referral volume aggregation; used by trend analytics endpoint.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW vw_referral_trends_monthly AS
SELECT
    YEAR(r.created_at)                                                   AS year,
    MONTH(r.created_at)                                                  AS month,
    DATE_FORMAT(r.created_at, '%Y-%m')                                   AS period,
    h.county,
    r.urgency_level,
    r.current_status,
    COUNT(*)                                                             AS referral_count,
    SUM(CASE WHEN r.current_status = 'Completed' THEN 1 ELSE 0 END)     AS completed_count,
    SUM(CASE WHEN r.current_status = 'Rejected'  THEN 1 ELSE 0 END)     AS rejected_count,
    ROUND(AVG(
        CASE WHEN r.completed_at IS NOT NULL AND r.dispatched_at IS NOT NULL
        THEN TIMESTAMPDIFF(HOUR, r.dispatched_at, r.completed_at) END
    ), 2)                                                                AS avg_hours_to_complete
FROM referrals r
INNER JOIN hospitals h ON h.id = r.source_hospital_id
GROUP BY
    YEAR(r.created_at),
    MONTH(r.created_at),
    DATE_FORMAT(r.created_at, '%Y-%m'),
    h.county,
    r.urgency_level,
    r.current_status;


-- =============================================================================
-- REPORTING TABLES (Materialised Snapshots)
-- Pre-aggregated tables populated by nightly BullMQ scheduled jobs.
-- Read by Report Service; never written from API request paths.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- rpt_daily_referral_summary
-- One row per hospital per day — dashboard KPIs.
-- Refreshed: nightly at 00:05 EAT by report worker.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rpt_daily_referral_summary (
    id                      INT        NOT NULL AUTO_INCREMENT,
    report_date             DATE       NOT NULL,
    hospital_id             INT        NOT NULL,
    hospital_name           VARCHAR(255) NOT NULL,
    county                  VARCHAR(100) NOT NULL,
    facility_level          VARCHAR(20) NOT NULL,
    outgoing_total          INT        NOT NULL DEFAULT 0,
    outgoing_completed      INT        NOT NULL DEFAULT 0,
    outgoing_rejected       INT        NOT NULL DEFAULT 0,
    outgoing_pending        INT        NOT NULL DEFAULT 0,
    incoming_total          INT        NOT NULL DEFAULT 0,
    incoming_accepted       INT        NOT NULL DEFAULT 0,
    incoming_rejected       INT        NOT NULL DEFAULT 0,
    incoming_pending        INT        NOT NULL DEFAULT 0,
    emergent_open           INT        NOT NULL DEFAULT 0,
    avg_accept_time_minutes DECIMAL(10,2) NULL,
    avg_complete_time_hours DECIMAL(10,2) NULL,
    generated_at            TIMESTAMP  NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_rpt_daily_hospital_date  (hospital_id, report_date),
    KEY idx_rpt_daily_date                 (report_date),
    KEY idx_rpt_daily_county               (county),
    KEY idx_rpt_daily_county_date          (county, report_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Nightly pre-aggregated daily referral KPIs per facility';

-- ─────────────────────────────────────────────────────────────────────────────
-- rpt_monthly_county_summary
-- County-level monthly roll-up for Ministry of Health reporting.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rpt_monthly_county_summary (
    id                  INT           NOT NULL AUTO_INCREMENT,
    report_year         SMALLINT      NOT NULL,
    report_month        TINYINT       NOT NULL,
    county              VARCHAR(100)  NOT NULL,
    total_referrals     INT           NOT NULL DEFAULT 0,
    completed           INT           NOT NULL DEFAULT 0,
    rejected            INT           NOT NULL DEFAULT 0,
    emergent            INT           NOT NULL DEFAULT 0,
    urgent              INT           NOT NULL DEFAULT 0,
    routine             INT           NOT NULL DEFAULT 0,
    unique_patients     INT           NOT NULL DEFAULT 0,
    active_facilities   INT           NOT NULL DEFAULT 0,
    avg_complete_hours  DECIMAL(10,2) NULL,
    generated_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_rpt_monthly_county (report_year, report_month, county),
    KEY idx_rpt_monthly_county       (county),
    KEY idx_rpt_monthly_year_month   (report_year, report_month)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Monthly county-level aggregation — MoH analytics';

-- ─────────────────────────────────────────────────────────────────────────────
-- rpt_facility_performance_snapshot
-- Rolling 30-day performance scores per facility.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rpt_facility_performance_snapshot (
    id                      INT           NOT NULL AUTO_INCREMENT,
    snapshot_date           DATE          NOT NULL,
    hospital_id             INT           NOT NULL,
    hospital_name           VARCHAR(255)  NOT NULL,
    county                  VARCHAR(100)  NOT NULL,
    facility_level          VARCHAR(20)   NOT NULL,
    referrals_sent_30d      INT           NOT NULL DEFAULT 0,
    referrals_received_30d  INT           NOT NULL DEFAULT 0,
    completion_rate_pct     DECIMAL(5,2)  NULL,
    rejection_rate_pct      DECIMAL(5,2)  NULL,
    avg_dispatch_to_complete_hours DECIMAL(10,2) NULL,
    active_users            INT           NOT NULL DEFAULT 0,
    generated_at            TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_rpt_perf_hospital_date (hospital_id, snapshot_date),
    KEY idx_rpt_perf_snapshot_date       (snapshot_date),
    KEY idx_rpt_perf_county              (county)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Rolling 30-day facility performance — refreshed nightly';


-- =============================================================================
-- AUDIT TABLES (Extended)
-- Supplements the core audit_logs with domain-specific snapshot tables.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- audit_patient_access
-- Logs every access to a patient record — KDPA compliance §10.4.
-- Written by Patient Service on every GET /patients/:id call.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_patient_access (
    id              BIGINT         NOT NULL AUTO_INCREMENT,
    patient_id      INT            NOT NULL,
    accessed_by     INT            NOT NULL COMMENT 'FK → users.id',
    access_type     ENUM('view_full','view_masked','search_result') NOT NULL,
    hospital_id     INT            NOT NULL,
    ip_address      VARCHAR(45)    NULL,
    referral_id     INT            NULL     COMMENT 'NULL if accessed outside referral context',
    accessed_at     TIMESTAMP(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    PRIMARY KEY (id),
    KEY idx_audit_patient_access_patient_id  (patient_id),
    KEY idx_audit_patient_access_accessed_by (accessed_by),
    KEY idx_audit_patient_access_hospital_id (hospital_id),
    KEY idx_audit_patient_access_accessed_at (accessed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='KDPA compliance: every read of patient PII is logged here';

-- ─────────────────────────────────────────────────────────────────────────────
-- audit_security_events
-- Authentication failures, 2FA events, token revocations — security SoC feed.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_security_events (
    id              BIGINT         NOT NULL AUTO_INCREMENT,
    event_type      ENUM(
        'LOGIN_SUCCESS',
        'LOGIN_FAILURE',
        'LOGOUT',
        '2FA_SUCCESS',
        '2FA_FAILURE',
        'TOKEN_REFRESH',
        'TOKEN_REVOKED',
        'PASSWORD_RESET_REQUEST',
        'PASSWORD_RESET_COMPLETE',
        'ACCOUNT_SUSPENDED',
        'ACCOUNT_ACTIVATED',
        'RATE_LIMIT_EXCEEDED'
    )               NOT NULL,
    user_id         INT            NULL,
    identifier      VARCHAR(255)   NULL     COMMENT 'Username or email attempted (not stored plaintext for sensitive cases)',
    ip_address      VARCHAR(45)    NULL,
    user_agent      VARCHAR(500)   NULL,
    hospital_id     INT            NULL,
    metadata_json   TEXT           NULL     COMMENT 'Non-sensitive event context',
    occurred_at     TIMESTAMP(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    PRIMARY KEY (id),
    KEY idx_audit_security_user_id      (user_id),
    KEY idx_audit_security_event_type   (event_type),
    KEY idx_audit_security_ip           (ip_address),
    KEY idx_audit_security_occurred_at  (occurred_at),
    KEY idx_audit_security_event_date   (event_type, occurred_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Security-specific event log — authentication and authorisation events';

-- ─────────────────────────────────────────────────────────────────────────────
-- audit_data_export
-- Tracks every report export or data download event.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_data_export (
    id              BIGINT         NOT NULL AUTO_INCREMENT,
    exported_by     INT            NOT NULL COMMENT 'FK → users.id',
    export_type     VARCHAR(100)   NOT NULL COMMENT 'e.g. county_report, facility_performance',
    parameters_json TEXT           NULL     COMMENT 'Filter parameters used — no PII',
    row_count       INT            NULL,
    format          ENUM('json','csv','xlsx','pdf') NOT NULL DEFAULT 'json',
    ip_address      VARCHAR(45)    NULL,
    exported_at     TIMESTAMP(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    PRIMARY KEY (id),
    KEY idx_audit_data_export_exported_by  (exported_by),
    KEY idx_audit_data_export_export_type  (export_type),
    KEY idx_audit_data_export_exported_at  (exported_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Tracks all report generation and data export events';

-- Immutability triggers for extended audit tables
DELIMITER $$

CREATE TRIGGER trg_audit_patient_access_no_update
    BEFORE UPDATE ON audit_patient_access FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'audit_patient_access is immutable';
END$$

CREATE TRIGGER trg_audit_patient_access_no_delete
    BEFORE DELETE ON audit_patient_access FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'audit_patient_access is immutable';
END$$

CREATE TRIGGER trg_audit_security_events_no_update
    BEFORE UPDATE ON audit_security_events FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'audit_security_events is immutable';
END$$

CREATE TRIGGER trg_audit_security_events_no_delete
    BEFORE DELETE ON audit_security_events FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'audit_security_events is immutable';
END$$

DELIMITER ;

-- =============================================================================
-- SCHEDULED EVENT — nightly cleanup
-- Requires MySQL event scheduler ON (SET GLOBAL event_scheduler = ON)
-- =============================================================================

DELIMITER $$

CREATE EVENT IF NOT EXISTS evt_nightly_cleanup
    ON SCHEDULE EVERY 1 DAY
    STARTS (CURRENT_DATE + INTERVAL 1 DAY + INTERVAL 1 HOUR)  -- 01:00 daily
    DO
BEGIN
    -- Purge expired / revoked refresh tokens
    CALL sp_purge_expired_refresh_tokens();

    -- Soft-delete device sessions not seen in 90 days
    DELETE FROM device_sessions
    WHERE last_seen_at < DATE_SUB(NOW(), INTERVAL 90 DAY);

    -- Trim old notification_logs rows (keep 30 days)
    DELETE FROM notification_logs
    WHERE attempted_at < DATE_SUB(NOW(), INTERVAL 30 DAY);
END$$

DELIMITER ;


-- =============================================================================
-- SEED: migration_history record for this baseline
-- =============================================================================

INSERT INTO migration_history (migration, checksum) VALUES
    ('001_create_hospitals',        'baseline'),
    ('002_create_users',            'baseline'),
    ('003_create_patients',         'baseline'),
    ('004_create_referrals',        'baseline'),
    ('005_create_referral_logs',    'baseline'),
    ('006_create_messages',         'baseline'),
    ('007_create_notifications',    'baseline'),
    ('008_create_audit_logs',       'baseline')
ON DUPLICATE KEY UPDATE checksum = VALUES(checksum);


-- =============================================================================
-- END OF PRMS DATABASE MODULE
-- Architecture Contract v1.0 compliant
-- =============================================================================
