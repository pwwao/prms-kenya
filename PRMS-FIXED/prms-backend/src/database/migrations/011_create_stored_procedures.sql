-- STORED PROCEDURES
-- =============================================================================

DELIMITER $$

-- ─────────────────────────────────────────────────────────────────────────────
-- sp_transition_referral_status
-- Called by Referral Service to atomically transition status and log the change.
-- Enforces the state machine defined in Architecture Contract §2.3.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE PROCEDURE sp_transition_referral_status (
    IN  p_referral_id       INT,
    IN  p_new_status        VARCHAR(20),
    IN  p_action_by_user_id INT,
    IN  p_notes             TEXT,
    IN  p_rejection_reason  TEXT,
    IN  p_ip_address        VARCHAR(45),
    OUT p_success           TINYINT,
    OUT p_error_message     VARCHAR(255)
)
BEGIN
    DECLARE v_current_status    VARCHAR(20);
    DECLARE v_transition_valid  TINYINT DEFAULT 0;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_success = 0;
        SET p_error_message = 'Transaction error during status transition';
    END;

    START TRANSACTION;

    -- Lock the referral row for the duration of the transaction
    SELECT current_status INTO v_current_status
    FROM referrals
    WHERE id = p_referral_id
    FOR UPDATE;

    IF v_current_status IS NULL THEN
        SET p_success = 0;
        SET p_error_message = 'Referral not found';
        ROLLBACK;
        LEAVE sp_transition_referral_status;
    END IF;

    -- Validate allowed transitions (mirrors §2.3 state machine)
    SET v_transition_valid = CASE
        WHEN v_current_status = 'Draft'      AND p_new_status = 'Dispatched' THEN 1
        WHEN v_current_status = 'Dispatched' AND p_new_status = 'Received'   THEN 1
        WHEN v_current_status = 'Dispatched' AND p_new_status = 'Draft'      THEN 1 -- recalled
        WHEN v_current_status = 'Received'   AND p_new_status = 'Accepted'   THEN 1
        WHEN v_current_status = 'Received'   AND p_new_status = 'Rejected'   THEN 1
        WHEN v_current_status = 'Accepted'   AND p_new_status = 'Completed'  THEN 1
        WHEN v_current_status = 'Accepted'   AND p_new_status = 'Rejected'   THEN 1
        WHEN v_current_status = 'Rejected'   AND p_new_status = 'Draft'      THEN 1 -- resubmit
        ELSE 0
    END;

    IF v_transition_valid = 0 THEN
        SET p_success = 0;
        SET p_error_message = CONCAT(
            'Invalid transition: ', v_current_status, ' → ', p_new_status
        );
        ROLLBACK;
        LEAVE sp_transition_referral_status;
    END IF;

    -- Require rejection_reason when rejecting
    IF p_new_status = 'Rejected' AND (p_rejection_reason IS NULL OR p_rejection_reason = '') THEN
        SET p_success = 0;
        SET p_error_message = 'rejection_reason is required when status is Rejected';
        ROLLBACK;
        LEAVE sp_transition_referral_status;
    END IF;

    -- Apply the status update
    UPDATE referrals
    SET
        current_status       = p_new_status,
        rejection_reason     = IF(p_new_status = 'Rejected', p_rejection_reason, rejection_reason),
        updated_at           = NOW()
    WHERE id = p_referral_id;

    -- Write the immutable log entry
    INSERT INTO referral_logs (
        referral_id,
        action_by_user_id,
        previous_status,
        new_status,
        notes,
        ip_address,
        logged_at
    ) VALUES (
        p_referral_id,
        p_action_by_user_id,
        v_current_status,
        p_new_status,
        p_notes,
        p_ip_address,
        NOW()
    );

    COMMIT;
    SET p_success = 1;
    SET p_error_message = NULL;
END$$

-- ─────────────────────────────────────────────────────────────────────────────
-- sp_create_audit_log
-- Called by backend audit middleware (async, non-blocking path).
-- Inserts a single row into audit_logs.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE PROCEDURE sp_create_audit_log (
    IN p_user_id           INT,
    IN p_action_type       VARCHAR(100),
    IN p_ip_address        VARCHAR(45),
    IN p_user_agent        VARCHAR(500),
    IN p_resource_type     VARCHAR(100),
    IN p_resource_id       INT,
    IN p_resource_affected VARCHAR(255),
    IN p_payload_snapshot  MEDIUMTEXT,
    IN p_hospital_id       INT
)
BEGIN
    INSERT INTO audit_logs (
        user_id,
        action_type,
        ip_address,
        user_agent,
        resource_type,
        resource_id,
        resource_affected,
        payload_snapshot,
        hospital_id,
        created_at
    ) VALUES (
        p_user_id,
        p_action_type,
        p_ip_address,
        p_user_agent,
        p_resource_type,
        p_resource_id,
        p_resource_affected,
        p_payload_snapshot,
        p_hospital_id,
        NOW(6)
    );
END$$

-- ─────────────────────────────────────────────────────────────────────────────
-- sp_get_referral_dashboard
-- Returns summary counts for a hospital's referral dashboard.
-- Used by the web and mobile dashboard endpoints.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE PROCEDURE sp_get_referral_dashboard (
    IN p_hospital_id INT
)
BEGIN
    SELECT
        SUM(CASE WHEN current_status = 'Draft'      THEN 1 ELSE 0 END) AS drafts,
        SUM(CASE WHEN current_status = 'Dispatched' THEN 1 ELSE 0 END) AS dispatched,
        SUM(CASE WHEN current_status = 'Received'   THEN 1 ELSE 0 END) AS received,
        SUM(CASE WHEN current_status = 'Accepted'   THEN 1 ELSE 0 END) AS accepted,
        SUM(CASE WHEN current_status = 'Rejected'   THEN 1 ELSE 0 END) AS rejected,
        SUM(CASE WHEN current_status = 'Completed'  THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN urgency_level  = 'Emergent'
                 AND current_status NOT IN ('Completed','Rejected')
            THEN 1 ELSE 0 END)                                          AS open_emergent,
        COUNT(*)                                                         AS total
    FROM referrals
    WHERE source_hospital_id = p_hospital_id
       OR destination_hospital_id = p_hospital_id;
END$$

-- ─────────────────────────────────────────────────────────────────────────────
-- sp_get_patient_referral_history
-- Returns all referrals for a patient (ordered newest first).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE PROCEDURE sp_get_patient_referral_history (
    IN p_patient_id INT
)
BEGIN
    SELECT
        r.id,
        r.referral_code,
        r.urgency_level,
        r.current_status,
        r.created_at,
        r.updated_at,
        hs.name  AS source_hospital_name,
        hd.name  AS destination_hospital_name
    FROM referrals r
    INNER JOIN hospitals hs ON hs.id = r.source_hospital_id
    INNER JOIN hospitals hd ON hd.id = r.destination_hospital_id
    WHERE r.patient_id = p_patient_id
    ORDER BY r.created_at DESC;
END$$

-- ─────────────────────────────────────────────────────────────────────────────
-- sp_mark_notifications_read
-- Bulk-marks all unread notifications for a user as read.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE PROCEDURE sp_mark_notifications_read (
    IN p_user_id INT
)
BEGIN
    UPDATE notifications
    SET is_read = 1
    WHERE user_id = p_user_id
      AND is_read = 0;

    SELECT ROW_COUNT() AS rows_updated;
END$$

-- ─────────────────────────────────────────────────────────────────────────────
-- sp_purge_expired_refresh_tokens
-- Scheduled cleanup — removes revoked or expired tokens.
-- Intended to be called by a nightly cron / BullMQ scheduled job.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE PROCEDURE sp_purge_expired_refresh_tokens ()
BEGIN
    DELETE FROM refresh_tokens
    WHERE expires_at < NOW()
       OR revoked_at IS NOT NULL;

    SELECT ROW_COUNT() AS rows_deleted;
END$$

-- ─────────────────────────────────────────────────────────────────────────────
-- sp_get_county_report
-- Aggregates referral counts by county for the System Admin analytics endpoint.
-- Targets: GET /api/v1/reports/county
-- NOTE: runs on read replica; no writes.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE PROCEDURE sp_get_county_report (
    IN p_from_date DATE,
    IN p_to_date   DATE
)
BEGIN
    SELECT
        h.county,
        COUNT(r.id)                                                      AS total_referrals,
        SUM(CASE WHEN r.current_status = 'Completed' THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN r.current_status = 'Rejected'  THEN 1 ELSE 0 END) AS rejected,
        SUM(CASE WHEN r.urgency_level  = 'Emergent'  THEN 1 ELSE 0 END) AS emergent,
        SUM(CASE WHEN r.urgency_level  = 'Urgent'    THEN 1 ELSE 0 END) AS urgent,
        SUM(CASE WHEN r.urgency_level  = 'Routine'   THEN 1 ELSE 0 END) AS routine,
        ROUND(
            AVG(
                CASE WHEN r.completed_at IS NOT NULL AND r.dispatched_at IS NOT NULL
                THEN TIMESTAMPDIFF(MINUTE, r.dispatched_at, r.completed_at)
                END
            ), 2
        )                                                                 AS avg_completion_minutes
    FROM referrals r
    INNER JOIN hospitals h ON h.id = r.source_hospital_id
    WHERE r.created_at BETWEEN p_from_date AND DATE_ADD(p_to_date, INTERVAL 1 DAY)
    GROUP BY h.county
    ORDER BY total_referrals DESC;
END$$

-- ─────────────────────────────────────────────────────────────────────────────
-- sp_get_facility_performance
-- Per-facility KPIs for Hospital Admin and System Admin.
-- Targets: GET /api/v1/reports/facility-performance
-- ─────────────────────────────────────────────────────────────────────────────
CREATE PROCEDURE sp_get_facility_performance (
    IN p_hospital_id INT,    -- NULL = all facilities (System Admin)
    IN p_from_date   DATE,
    IN p_to_date     DATE
)
BEGIN
    SELECT
        h.id                                                             AS hospital_id,
        h.name                                                           AS hospital_name,
        h.county,
        h.facility_level,
        COUNT(DISTINCT r_out.id)                                         AS outgoing_referrals,
        COUNT(DISTINCT r_in.id)                                          AS incoming_referrals,
        SUM(CASE WHEN r_out.current_status = 'Completed' THEN 1 ELSE 0 END) AS completed_outgoing,
        SUM(CASE WHEN r_in.current_status  = 'Rejected'  THEN 1 ELSE 0 END) AS rejections_incoming,
        ROUND(
            AVG(
                CASE WHEN r_in.accepted_at IS NOT NULL AND r_in.received_at IS NOT NULL
                THEN TIMESTAMPDIFF(MINUTE, r_in.received_at, r_in.accepted_at)
                END
            ), 2
        )                                                                 AS avg_accept_time_minutes
    FROM hospitals h
    LEFT JOIN referrals r_out ON r_out.source_hospital_id      = h.id
         AND r_out.created_at BETWEEN p_from_date AND DATE_ADD(p_to_date, INTERVAL 1 DAY)
    LEFT JOIN referrals r_in  ON r_in.destination_hospital_id  = h.id
         AND r_in.created_at  BETWEEN p_from_date AND DATE_ADD(p_to_date, INTERVAL 1 DAY)
    WHERE h.status = 'Approved'
      AND (p_hospital_id IS NULL OR h.id = p_hospital_id)
    GROUP BY h.id, h.name, h.county, h.facility_level
    ORDER BY outgoing_referrals DESC;
END$$

DELIMITER ;


-- =============================================================================
