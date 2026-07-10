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
