-- VIEWS
-- (Queries joining >4 tables extracted to views per §9.2)
-- All views are read-only; Report Service uses these exclusively.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- vw_referral_full
-- Complete denormalised referral record for list and detail endpoints.
-- Joins: referrals, patients, hospitals (×2), users (×3)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW vw_referral_full AS
SELECT
    r.id                            AS referral_id,
    r.referral_code,
    r.urgency_level,
    r.current_status,
    r.reason_for_referral,
    r.clinical_summary_encrypted,   -- decrypted in service layer
    r.rejection_reason,
    r.created_at                    AS referral_created_at,
    r.updated_at                    AS referral_updated_at,
    r.dispatched_at,
    r.received_at,
    r.accepted_at,
    r.rejected_at,
    r.completed_at,
    -- patient
    r.patient_id,
    p.gender                        AS patient_gender,
    p.date_of_birth                 AS patient_dob,
    p.county                        AS patient_county,
    p.full_name_encrypted           AS patient_name_encrypted,  -- decrypted in service
    p.national_id_encrypted         AS patient_nid_encrypted,
    p.phone_encrypted               AS patient_phone_encrypted,
    -- source hospital
    r.source_hospital_id,
    hs.name                         AS source_hospital_name,
    hs.county                       AS source_hospital_county,
    hs.facility_level               AS source_facility_level,
    -- destination hospital
    r.destination_hospital_id,
    hd.name                         AS destination_hospital_name,
    hd.county                       AS destination_hospital_county,
    hd.facility_level               AS destination_facility_level,
    -- created by
    r.created_by_user_id,
    uc.username                     AS created_by_username,
    uc.role                         AS created_by_role,
    -- received by
    r.received_by_user_id,
    ur.username                     AS received_by_username,
    -- accepted/rejected by
    r.accepted_rejected_by_user_id,
    ua.username                     AS accepted_rejected_by_username
FROM referrals r
INNER JOIN patients  p  ON p.id  = r.patient_id
INNER JOIN hospitals hs ON hs.id = r.source_hospital_id
INNER JOIN hospitals hd ON hd.id = r.destination_hospital_id
INNER JOIN users     uc ON uc.id = r.created_by_user_id
LEFT  JOIN users     ur ON ur.id = r.received_by_user_id
LEFT  JOIN users     ua ON ua.id = r.accepted_rejected_by_user_id;

-- ─────────────────────────────────────────────────────────────────────────────
-- vw_referral_timeline
-- Ordered log entries for the referral detail timeline view.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW vw_referral_timeline AS
SELECT
    rl.id               AS log_id,
    rl.referral_id,
    r.referral_code,
    rl.previous_status,
    rl.new_status,
    rl.notes,
    rl.logged_at,
    u.id                AS actor_user_id,
    u.username          AS actor_username,
    u.role              AS actor_role,
    h.name              AS actor_hospital_name
FROM referral_logs rl
INNER JOIN referrals r ON r.id = rl.referral_id
INNER JOIN users     u ON u.id = rl.action_by_user_id
LEFT  JOIN hospitals h ON h.id = u.hospital_id
ORDER BY rl.logged_at ASC;

-- ─────────────────────────────────────────────────────────────────────────────
-- vw_hospital_users_summary
-- List of users per hospital with last-login, used by Hospital Admin.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW vw_hospital_users_summary AS
SELECT
    u.id,
    u.hospital_id,
    h.name       AS hospital_name,
    u.username,
    u.email,
    u.role,
    u.status,
    u.is_two_factor_enabled,
    u.last_login_at,
    u.created_at
FROM users u
INNER JOIN hospitals h ON h.id = u.hospital_id
WHERE u.deleted_at IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- vw_notification_inbox
-- User notification inbox with unread count; used by notification list endpoint.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW vw_notification_inbox AS
SELECT
    n.id,
    n.user_id,
    u.username,
    n.type,
    n.title,
    n.body,
    n.payload_json,
    n.channel,
    n.is_read,
    n.created_at
FROM notifications n
INNER JOIN users u ON u.id = n.user_id
WHERE u.deleted_at IS NULL
ORDER BY n.created_at DESC;

-- ─────────────────────────────────────────────────────────────────────────────
-- vw_audit_log_detail
-- Audit log with user and hospital context; used by System Admin audit trail.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW vw_audit_log_detail AS
SELECT
    al.id,
    al.created_at,
    al.action_type,
    al.resource_type,
    al.resource_id,
    al.resource_affected,
    al.ip_address,
    al.user_agent,
    al.payload_snapshot,
    u.id            AS user_id,
    u.username,
    u.role          AS user_role,
    h.id            AS hospital_id,
    h.name          AS hospital_name,
    h.county        AS hospital_county
FROM audit_logs al
LEFT  JOIN users     u ON u.id = al.user_id
LEFT  JOIN hospitals h ON h.id = al.hospital_id
ORDER BY al.created_at DESC;

-- ─────────────────────────────────────────────────────────────────────────────
-- vw_referral_trends_monthly
-- Monthly referral volume aggregation; used by trend analytics endpoint.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW vw_referral_trends_monthly AS
SELECT
    YEAR(r.created_at)                                                   AS year,
    MONTH(r.created_at)                                                  AS month,
    DATE_FORMAT(r.created_at, '%Y-%m')                                   AS period,
    h.county,
    r.urgency_level,
    r.current_status,
    COUNT(*)                                                             AS referral_count,
    SUM(CASE WHEN r.current_status = 'Completed' THEN 1 ELSE 0 END)     AS completed_count,
    SUM(CASE WHEN r.current_status = 'Rejected'  THEN 1 ELSE 0 END)     AS rejected_count,
    ROUND(AVG(
        CASE WHEN r.completed_at IS NOT NULL AND r.dispatched_at IS NOT NULL
        THEN TIMESTAMPDIFF(HOUR, r.dispatched_at, r.completed_at) END
    ), 2)                                                                AS avg_hours_to_complete
FROM referrals r
INNER JOIN hospitals h ON h.id = r.source_hospital_id
GROUP BY
    YEAR(r.created_at),
    MONTH(r.created_at),
    DATE_FORMAT(r.created_at, '%Y-%m'),
    h.county,
    r.urgency_level,
    r.current_status;


-- =============================================================================
-- REPORTING TABLES (Materialised Snapshots)
-- Pre-aggregated tables populated by nightly BullMQ scheduled jobs.
-- Read by Report Service; never written from API request paths.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- rpt_daily_referral_summary
-- One row per hospital per day — dashboard KPIs.
-- Refreshed: nightly at 00:05 EAT by report worker.
-- ─────────────────────────────────────────────────────────────────────────────
