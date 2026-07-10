/**
 * Hash Service — HMAC-SHA256 Blind Index
 *
 * Architecture Contract §9.5:
 * "Search on encrypted fields — HMAC-SHA256 hash in separate `_hash` column"
 *
 * Produces deterministic, collision-resistant hashes used for lookups
 * (e.g. national_id_hash, full_name_hash, phone_hash) without decrypting.
 * The hash salt is separate from the encryption key.
 */

import { createHmac } from 'crypto';
import { getHashSalt } from '../../config/encryption.config.js';
import { EncryptionError } from '../errors/domain.errors.js';

/**
 * Produces a deterministic HMAC-SHA256 hex digest for a given value.
 * Used to create blind-index columns for searching encrypted fields.
 *
 * Normalisation is the caller's responsibility:
 * - National IDs: strip spaces, uppercase
 * - Names: lowercase, trim, normalise unicode
 * - Phone numbers: strip non-digits, canonical E.164
 *
 * @param value - The plaintext value to hash (already normalised)
 * @returns 64-character hex string
 * @throws EncryptionError on any failure
 */
export function hashForIndex(value: string): string {
  try {
    const salt = getHashSalt();
    return createHmac('sha256', salt).update(value, 'utf8').digest('hex');
  } catch (err) {
    throw new EncryptionError('hash', err);
  }
}

/**
 * Hashes a nullable value.
 * Returns null if the value is null or empty string.
 */
export function hashForIndexNullable(value: string | null | undefined): string | null {
  if (!value) return null;
  return hashForIndex(value);
}

/**
 * Normalises a national ID for hashing.
 * Strips spaces and uppercases the value.
 */
export function normaliseNationalId(value: string): string {
  return value.replace(/\s+/g, '').toUpperCase();
}

/**
 * Normalises a full name for hashing.
 * Lowercases, trims, and collapses internal whitespace.
 */
export function normaliseFullName(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Normalises a phone number for hashing.
 * Strips all non-digit characters.
 */
export function normalisePhone(value: string): string {
  return value.replace(/\D/g, '');
}

// ─── Convenience wrappers ─────────────────────────────────────────────────────

/** Hash a national ID (normalised before hashing). */
export function hashNationalId(nationalId: string): string {
  return hashForIndex(normaliseNationalId(nationalId));
}

/** Hash a full name (normalised before hashing). */
export function hashFullName(fullName: string): string {
  return hashForIndex(normaliseFullName(fullName));
}

/** Hash a phone number (normalised before hashing). */
export function hashPhone(phone: string): string {
  return hashForIndex(normalisePhone(phone));
}
