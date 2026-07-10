-- =============================================================================
-- MIGRATION 016 — MAKE users.email OPTIONAL
-- =============================================================================
-- Staff registration should not force ID number / phone / email as mandatory.
-- MySQL unique indexes allow multiple NULL values (each NULL is treated as
-- distinct), so dropping NOT NULL keeps the uq_users_email constraint working
-- correctly for the users that DO have an email on file.
--
-- IMPORTANT: application code must insert/update NULL (not '') when the field
-- is left blank — an empty string is a real value and would collide with any
-- other user who also has a blank email.
-- =============================================================================

ALTER TABLE users
  MODIFY COLUMN email VARCHAR(255) NULL;
