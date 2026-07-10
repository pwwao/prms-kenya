-- TRIGGERS — IMMUTABILITY & INTEGRITY
-- =============================================================================

DELIMITER $$

-- audit_logs: block UPDATE
CREATE TRIGGER trg_audit_logs_no_update
    BEFORE UPDATE ON audit_logs
    FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'audit_logs rows are immutable — UPDATE not permitted';
END$$

-- audit_logs: block DELETE
CREATE TRIGGER trg_audit_logs_no_delete
    BEFORE DELETE ON audit_logs
    FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'audit_logs rows are immutable — DELETE not permitted';
END$$

-- referral_logs: block UPDATE
CREATE TRIGGER trg_referral_logs_no_update
    BEFORE UPDATE ON referral_logs
    FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'referral_logs rows are immutable — UPDATE not permitted';
END$$

-- referral_logs: block DELETE
CREATE TRIGGER trg_referral_logs_no_delete
    BEFORE DELETE ON referral_logs
    FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'referral_logs rows are immutable — DELETE not permitted';
END$$

-- referrals: auto-generate referral_code on INSERT
CREATE TRIGGER trg_referrals_generate_code
    BEFORE INSERT ON referrals
    FOR EACH ROW
BEGIN
    -- Format: REF-YYYY-NNNNN (zero-padded to 5 digits within the year)
    -- Application layer can override if it generates its own code first
    IF NEW.referral_code IS NULL OR NEW.referral_code = '' THEN
        SET NEW.referral_code = CONCAT(
            'REF-',
            YEAR(NOW()),
            '-',
            LPAD(
                (SELECT COALESCE(MAX(id), 0) + 1 FROM referrals),
                5, '0'
            )
        );
    END IF;
END$$

-- referrals: stamp timestamp columns on status transitions
CREATE TRIGGER trg_referrals_status_timestamps
    BEFORE UPDATE ON referrals
    FOR EACH ROW
BEGIN
    IF NEW.current_status <> OLD.current_status THEN
        CASE NEW.current_status
            WHEN 'Dispatched' THEN SET NEW.dispatched_at = NOW();
            WHEN 'Received'   THEN SET NEW.received_at   = NOW();
            WHEN 'Accepted'   THEN SET NEW.accepted_at   = NOW();
            WHEN 'Rejected'   THEN SET NEW.rejected_at   = NOW();
            WHEN 'Completed'  THEN SET NEW.completed_at  = NOW();
            ELSE BEGIN END;
        END CASE;
    END IF;
END$$

DELIMITER ;


-- =============================================================================
