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


