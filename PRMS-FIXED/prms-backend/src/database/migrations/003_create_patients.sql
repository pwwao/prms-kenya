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


