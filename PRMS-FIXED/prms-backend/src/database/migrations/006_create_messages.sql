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


