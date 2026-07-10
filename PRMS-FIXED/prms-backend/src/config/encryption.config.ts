/**
 * Encryption Configuration — AES-256-GCM
 *
 * Architecture Contract §9.5 — Encryption field standards.
 * Key derivation and IV/authTag size constants.
 * Actual encrypt/decrypt logic lives in shared/services/crypto.service.ts.
 */

import { env } from './env.config.js';

// ─── Constants ────────────────────────────────────────────────────────────────

/** AES-256-GCM uses a 12-byte (96-bit) IV per operation. */
export const ENCRYPTION_IV_BYTES = 12;

/** GCM authentication tag length — 16 bytes (128-bit). */
export const ENCRYPTION_AUTH_TAG_BYTES = 16;

/** Algorithm string for Node.js crypto module. */
export const ENCRYPTION_ALGORITHM = 'aes-256-gcm' as const;

/**
 * Stored ciphertext format — JSON stored as TEXT in MySQL.
 * Architecture Contract §9.5: `{"iv":"hex","authTag":"hex","content":"hex"}`
 */
export interface IEncryptedPayload {
  iv: string;
  authTag: string;
  content: string;
}

// ─── Key Accessors ────────────────────────────────────────────────────────────

let encryptionKeyBuffer: Buffer | null = null;
let hashSaltBuffer: Buffer | null = null;

/**
 * Returns the AES-256-GCM encryption key as a Buffer.
 * Lazily parsed from the DATABASE_ENCRYPTION_KEY env var (64-char hex → 32 bytes).
 */
export function getEncryptionKey(): Buffer {
  if (!encryptionKeyBuffer) {
    encryptionKeyBuffer = Buffer.from(env.DATABASE_ENCRYPTION_KEY, 'hex');
    if (encryptionKeyBuffer.length !== 32) {
      throw new Error(
        '[Encryption] DATABASE_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes).',
      );
    }
  }
  return encryptionKeyBuffer;
}

/**
 * Returns the HMAC-SHA256 hash salt as a Buffer.
 * Used for blind-index lookups on encrypted fields.
 * Architecture Contract §9.5 — separate from encryption key.
 */
export function getHashSalt(): Buffer {
  if (!hashSaltBuffer) {
    hashSaltBuffer = Buffer.from(env.HASH_SALT, 'hex');
    if (hashSaltBuffer.length !== 32) {
      throw new Error(
        '[Encryption] HASH_SALT must be exactly 64 hex characters (32 bytes).',
      );
    }
  }
  return hashSaltBuffer;
}
