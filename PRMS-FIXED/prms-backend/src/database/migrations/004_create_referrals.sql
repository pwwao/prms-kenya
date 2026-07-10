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


