/**
 * Vitest Global Setup
 * Runs once before all test files.
 * Sets required env vars for test environment.
 */

import { vi } from 'vitest';

// ── Inject test environment variables before any module loads ─────────────────
process.env.NODE_ENV               = 'test';
process.env.PORT                   = '3001';
process.env.API_BASE_URL           = 'http://localhost:3001';
process.env.DB_HOST                = process.env.DB_HOST     ?? 'localhost';
process.env.DB_PORT                = process.env.DB_PORT     ?? '3306';
process.env.DB_NAME                = process.env.DB_NAME     ?? 'prms_test';
process.env.DB_USER                = process.env.DB_USER     ?? 'prms_test';
process.env.DB_PASSWORD            = process.env.DB_PASSWORD ?? 'prms_test';
process.env.REDIS_HOST             = process.env.REDIS_HOST  ?? 'localhost';
process.env.REDIS_PORT             = process.env.REDIS_PORT  ?? '6379';
process.env.JWT_PRIVATE_KEY_PATH   = process.env.JWT_PRIVATE_KEY_PATH ?? './keys/jwt.private.key';
process.env.JWT_PUBLIC_KEY_PATH    = process.env.JWT_PUBLIC_KEY_PATH  ?? './keys/jwt.public.key';
process.env.JWT_ACCESS_EXPIRY      = '900';
process.env.JWT_REFRESH_EXPIRY     = '604800';
process.env.DATABASE_ENCRYPTION_KEY = process.env.DATABASE_ENCRYPTION_KEY ?? 'a'.repeat(64);
process.env.HASH_SALT               = process.env.HASH_SALT ?? 'b'.repeat(64);
process.env.BCRYPT_ROUNDS           = '4'; // fast rounds in tests
process.env.FCM_PROJECT_ID          = 'test-project';
process.env.FCM_PRIVATE_KEY         = 'test-key';
process.env.FCM_CLIENT_EMAIL        = 'test@test-project.iam.gserviceaccount.com';
process.env.AFRICASTALKING_API_KEY  = 'test-key';
process.env.AFRICASTALKING_USERNAME = 'sandbox';
process.env.SMTP_HOST               = 'localhost';
process.env.SMTP_PORT               = '1025';
process.env.SMTP_USER               = 'test';
process.env.SMTP_PASSWORD           = 'test';
process.env.SMTP_FROM_ADDRESS       = 'noreply@test.com';
process.env.CORS_ALLOWED_ORIGINS    = 'http://localhost:5173';

// ── Suppress console output in tests (unless DEBUG=true) ─────────────────────
if (!process.env.DEBUG) {
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  vi.spyOn(console, 'info').mockImplementation(() => undefined);
  // Keep console.error visible for debugging
}
