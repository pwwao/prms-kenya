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


