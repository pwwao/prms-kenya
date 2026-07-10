/**
 * Crypto Service — AES-256-GCM Encrypt / Decrypt
 *
 * Architecture Contract §9.5, §10.4:
 * - This is the ONLY place encryption logic lives.
 * - Encrypt before write, decrypt after read — in Service layer only.
 * - Repositories store raw encrypted JSON strings.
 * - Controllers never touch plaintext PII directly.
 *
 * Stored format: JSON `{"iv":"hex","authTag":"hex","content":"hex"}`
 */

import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import {
  getEncryptionKey,
  ENCRYPTION_ALGORITHM,
  ENCRYPTION_IV_BYTES,
  ENCRYPTION_AUTH_TAG_BYTES,
  type IEncryptedPayload,
} from '../../config/encryption.config.js';
import { EncryptionError } from '../errors/domain.errors.js';

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Generates a fresh random IV per call (never reuse IVs with the same key).
 *
 * @param plaintext - The string to encrypt (PII field value)
 * @returns JSON string to store in the database TEXT column
 * @throws EncryptionError on any crypto failure
 */
export function encrypt(plaintext: string): string {
  try {
    const key = getEncryptionKey();
    const iv = randomBytes(ENCRYPTION_IV_BYTES);

    const cipher = createCipheriv(ENCRYPTION_ALGORITHM, key, iv, {
      authTagLength: ENCRYPTION_AUTH_TAG_BYTES,
    });

    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    const payload: IEncryptedPayload = {
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      content: encrypted.toString('hex'),
    };

    return JSON.stringify(payload);
  } catch (err) {
    throw new EncryptionError('encrypt', err);
  }
}

/**
 * Decrypts a ciphertext JSON string produced by `encrypt()`.
 *
 * @param cipherJson - JSON string from the database column
 * @returns Decrypted plaintext string
 * @throws EncryptionError on any crypto or parse failure
 */
export function decrypt(cipherJson: string): string {
  try {
    const key = getEncryptionKey();
    const payload = JSON.parse(cipherJson) as IEncryptedPayload;

    const iv = Buffer.from(payload.iv, 'hex');
    const authTag = Buffer.from(payload.authTag, 'hex');
    const content = Buffer.from(payload.content, 'hex');

    const decipher = createDecipheriv(ENCRYPTION_ALGORITHM, key, iv, {
      authTagLength: ENCRYPTION_AUTH_TAG_BYTES,
    });
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(content),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  } catch (err) {
    throw new EncryptionError('decrypt', err);
  }
}

/**
 * Decrypts a nullable ciphertext column.
 * Returns null if the stored value is null or empty.
 */
export function decryptNullable(cipherJson: string | null | undefined): string | null {
  if (!cipherJson) return null;
  return decrypt(cipherJson);
}

/**
 * Encrypts a nullable value.
 * Returns null if the value is null or undefined.
 */
export function encryptNullable(plaintext: string | null | undefined): string | null {
  if (plaintext == null) return null;
  return encrypt(plaintext);
}
