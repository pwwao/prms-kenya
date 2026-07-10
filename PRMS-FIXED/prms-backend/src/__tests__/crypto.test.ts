/**
 * Crypto & Hash Service — Integration Tests
 * Tests AES-256-GCM encrypt/decrypt and HMAC-SHA256 blind index
 * using real crypto (no mocks — these must match production behaviour).
 */

import { describe, it, expect, beforeAll } from 'vitest';

// Inject test keys before importing services
const TEST_KEY = 'a'.repeat(64);   // 32 bytes hex
const TEST_SALT = 'b'.repeat(64);  // 32 bytes hex

process.env.DATABASE_ENCRYPTION_KEY = TEST_KEY;
process.env.HASH_SALT = TEST_SALT;

import { encrypt, decrypt, encryptNullable, decryptNullable } from '../shared/services/crypto.service.js';
import { EncryptionError } from '../shared/errors/domain.errors.js';
import {
  hashForIndex,
  hashNationalId,
  hashFullName,
  hashPhone,
  normaliseNationalId,
  normaliseFullName,
  normalisePhone,
} from '../shared/services/hash.service.js';

describe('CryptoService — AES-256-GCM', () => {
  it('encrypts and decrypts a plaintext string', () => {
    const plaintext = 'John Doe';
    const cipher = encrypt(plaintext);
    expect(decrypt(cipher)).toBe(plaintext);
  });

  it('produces unique ciphertexts per call (unique IV)', () => {
    const c1 = encrypt('same value');
    const c2 = encrypt('same value');
    expect(c1).not.toBe(c2);
  });

  it('stored format is valid JSON with iv, authTag, content', () => {
    const cipher = encrypt('test');
    const parsed = JSON.parse(cipher) as { iv: string; authTag: string; content: string };
    expect(parsed.iv).toHaveLength(24);      // 12 bytes as hex
    expect(parsed.authTag).toHaveLength(32); // 16 bytes as hex
    expect(parsed.content.length).toBeGreaterThan(0);
  });

  it('throws EncryptionError on tampered ciphertext', () => {
    const cipher = JSON.parse(encrypt('secret')) as { iv: string; authTag: string; content: string };
    cipher.content = 'deadbeef';
    expect(() => decrypt(JSON.stringify(cipher))).toThrow(EncryptionError);
  });

  it('throws EncryptionError on tampered authTag', () => {
    const cipher = JSON.parse(encrypt('secret')) as { iv: string; authTag: string; content: string };
    cipher.authTag = '00'.repeat(16);
    expect(() => decrypt(JSON.stringify(cipher))).toThrow(EncryptionError);
  });

  it('handles unicode and long strings', () => {
    const long = '名前：田中太郎 '.repeat(100);
    expect(decrypt(encrypt(long))).toBe(long);
  });

  it('encryptNullable returns null for null input', () => {
    expect(encryptNullable(null)).toBeNull();
    expect(encryptNullable(undefined)).toBeNull();
  });

  it('decryptNullable returns null for null input', () => {
    expect(decryptNullable(null)).toBeNull();
    expect(decryptNullable('')).toBeNull();
  });

  it('round-trips through nullable helpers', () => {
    const val = 'Nairobi County Hospital';
    expect(decryptNullable(encryptNullable(val)!)).toBe(val);
  });
});

describe('HashService — HMAC-SHA256 blind index', () => {
  it('produces deterministic output for the same input', () => {
    expect(hashForIndex('test')).toBe(hashForIndex('test'));
  });

  it('produces different hashes for different inputs', () => {
    expect(hashForIndex('alice')).not.toBe(hashForIndex('bob'));
  });

  it('output is 64 hex characters (32 bytes)', () => {
    expect(hashForIndex('anything')).toHaveLength(64);
    expect(hashForIndex('anything')).toMatch(/^[0-9a-f]{64}$/);
  });

  it('normaliseNationalId strips spaces and uppercases', () => {
    expect(normaliseNationalId(' 12 345 678 ')).toBe('12345678');
    expect(normaliseNationalId('ab cd')).toBe('ABCD');
  });

  it('normaliseFullName lowercases and collapses whitespace', () => {
    expect(normaliseFullName('  John  DOE  ')).toBe('john doe');
  });

  it('normalisePhone strips non-digits', () => {
    expect(normalisePhone('+254-722-000-000')).toBe('254722000000');
  });

  it('hashNationalId normalises before hashing', () => {
    expect(hashNationalId('12345678')).toBe(hashNationalId('1234 5678'));
    expect(hashNationalId('abcdef')).toBe(hashNationalId('ABCDEF'));
  });

  it('hashFullName normalises before hashing', () => {
    expect(hashFullName('John Doe')).toBe(hashFullName('  john  doe  '));
  });

  it('hashPhone normalises before hashing', () => {
    expect(hashPhone('+254722000000')).toBe(hashPhone('254722000000'));
  });
});
