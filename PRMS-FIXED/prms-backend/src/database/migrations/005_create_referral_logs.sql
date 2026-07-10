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


