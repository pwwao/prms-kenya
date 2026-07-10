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


