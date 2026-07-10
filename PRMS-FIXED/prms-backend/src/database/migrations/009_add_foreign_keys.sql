-- =============================================================================
-- FOREIGN KEY CONSTRAINTS
-- Added after all tables exist to avoid ordering issues
-- =============================================================================

-- hospital_approvals
ALTER TABLE hospital_approvals
    ADD CONSTRAINT fk_hospital_approvals_hospitals
        FOREIGN KEY (hospital_id) REFERENCES hospitals (id)
        ON DELETE RESTRICT ON UPDATE CASCADE;

-- users
ALTER TABLE users
    ADD CONSTRAINT fk_users_hospitals
        FOREIGN KEY (hospital_id) REFERENCES hospitals (id)
        ON DELETE RESTRICT ON UPDATE CASCADE;

-- refresh_tokens
ALTER TABLE refresh_tokens
    ADD CONSTRAINT fk_refresh_tokens_users
        FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE CASCADE ON UPDATE CASCADE;

-- device_sessions
ALTER TABLE device_sessions
    ADD CONSTRAINT fk_device_sessions_users
        FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE CASCADE ON UPDATE CASCADE;

-- patients
ALTER TABLE patients
    ADD CONSTRAINT fk_patients_users
        FOREIGN KEY (registered_by_user_id) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT fk_patients_hospitals
        FOREIGN KEY (registered_at_hospital_id) REFERENCES hospitals (id)
        ON DELETE RESTRICT ON UPDATE CASCADE;

-- referrals
-- NOTE (fixed during setup): source_hospital_id and destination_hospital_id
-- use ON UPDATE RESTRICT, not CASCADE. MySQL 8 disallows a column being
-- part of both a CHECK constraint and a foreign key with CASCADE/SET NULL
-- referential actions (see chk_referrals_different_hospitals below) — the
-- original CASCADE caused: "Column 'destination_hospital_id' cannot be
-- used in a check constraint ... needed in a foreign key constraint
-- referential action." RESTRICT is also the more correct choice here
-- regardless, since hospital IDs are not expected to change once created.
ALTER TABLE referrals
    ADD CONSTRAINT fk_referrals_patients
        FOREIGN KEY (patient_id) REFERENCES patients (id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT fk_referrals_source_hospitals
        FOREIGN KEY (source_hospital_id) REFERENCES hospitals (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    ADD CONSTRAINT fk_referrals_destination_hospitals
        FOREIGN KEY (destination_hospital_id) REFERENCES hospitals (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    ADD CONSTRAINT fk_referrals_created_by_users
        FOREIGN KEY (created_by_user_id) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT fk_referrals_received_by_users
        FOREIGN KEY (received_by_user_id) REFERENCES users (id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT fk_referrals_accepted_rejected_by_users
        FOREIGN KEY (accepted_rejected_by_user_id) REFERENCES users (id)
        ON DELETE SET NULL ON UPDATE CASCADE;

-- referral_attachments
ALTER TABLE referral_attachments
    ADD CONSTRAINT fk_referral_attachments_referrals
        FOREIGN KEY (referral_id) REFERENCES referrals (id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT fk_referral_attachments_users
        FOREIGN KEY (uploaded_by_user_id) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE CASCADE;

-- referral_logs
ALTER TABLE referral_logs
    ADD CONSTRAINT fk_referral_logs_referrals
        FOREIGN KEY (referral_id) REFERENCES referrals (id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT fk_referral_logs_users
        FOREIGN KEY (action_by_user_id) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE CASCADE;

-- messages
ALTER TABLE messages
    ADD CONSTRAINT fk_messages_referrals
        FOREIGN KEY (referral_id) REFERENCES referrals (id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT fk_messages_users
        FOREIGN KEY (sender_id) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE CASCADE;

-- message_read_receipts
ALTER TABLE message_read_receipts
    ADD CONSTRAINT fk_message_read_receipts_messages
        FOREIGN KEY (message_id) REFERENCES messages (id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT fk_message_read_receipts_users
        FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE CASCADE ON UPDATE CASCADE;

-- notifications
ALTER TABLE notifications
    ADD CONSTRAINT fk_notifications_users
        FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE CASCADE ON UPDATE CASCADE;

-- notification_logs
ALTER TABLE notification_logs
    ADD CONSTRAINT fk_notification_logs_notifications
        FOREIGN KEY (notification_id) REFERENCES notifications (id)
        ON DELETE CASCADE ON UPDATE CASCADE;

-- audit_logs
ALTER TABLE audit_logs
    ADD CONSTRAINT fk_audit_logs_users
        FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE SET NULL ON UPDATE CASCADE;


-- =============================================================================
-- CHECK CONSTRAINTS (MySQL 8.0.16+)
-- =============================================================================

ALTER TABLE referrals
    ADD CONSTRAINT chk_referrals_different_hospitals
        CHECK (source_hospital_id <> destination_hospital_id),
    ADD CONSTRAINT chk_referrals_rejection_reason
        CHECK (
            current_status != 'Rejected' OR rejection_reason IS NOT NULL
        );

ALTER TABLE referral_logs
    ADD CONSTRAINT chk_referral_logs_status_change
        CHECK (previous_status IS NULL OR previous_status <> new_status);

ALTER TABLE notification_logs
    ADD CONSTRAINT chk_notification_logs_attempt
        CHECK (attempt_number BETWEEN 1 AND 3);

ALTER TABLE hospital_approvals
    ADD CONSTRAINT chk_hospital_approvals_status_change
        CHECK (previous_status <> new_status);


-- =============================================================================