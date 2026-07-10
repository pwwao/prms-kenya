-- =============================================================================
-- MIGRATION 002 — CREATE users
-- =============================================================================

CREATE TABLE IF NOT EXISTS users (
    id                      INT            NOT NULL AUTO_INCREMENT,
    hospital_id             INT            NULL     COMMENT 'NULL for System Admin',
    username                VARCHAR(50)    NOT NULL,
    email                   VARCHAR(255)   NOT NULL,
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


