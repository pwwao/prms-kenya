DELIMITER $$

CREATE TRIGGER trg_audit_patient_access_no_update
    BEFORE UPDATE ON audit_patient_access FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'audit_patient_access is immutable';
END$$

CREATE TRIGGER trg_audit_patient_access_no_delete
    BEFORE DELETE ON audit_patient_access FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'audit_patient_access is immutable';
END$$

CREATE TRIGGER trg_audit_security_events_no_update
    BEFORE UPDATE ON audit_security_events FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'audit_security_events is immutable';
END$$

CREATE TRIGGER trg_audit_security_events_no_delete
    BEFORE DELETE ON audit_security_events FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'audit_security_events is immutable';
END$$

DELIMITER ;

-- =============================================================================
