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
