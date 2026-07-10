/**
 * Environment Configuration Loader
 *
 * Validates and exports all required environment variables.
 * Fails fast at startup if any required variable is missing or invalid.
 * Architecture Contract §15.1
 */

import { readFileSync } from 'fs';
import { z } from 'zod';

// ─── Schema ──────────────────────────────────────────────────────────────────

const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  API_BASE_URL: z.string().url(),

  // Database
  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().int().default(3306),
  DB_NAME: z.string().min(1),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  DB_POOL_MIN: z.coerce.number().int().default(10),
  DB_POOL_MAX: z.coerce.number().int().default(50),

  // Redis
  REDIS_HOST: z.string().min(1),
  REDIS_PORT: z.coerce.number().int().default(6379),
  REDIS_PASSWORD: z.string().optional(),

  // Security
  JWT_PRIVATE_KEY_PATH: z.string().min(1),
  JWT_PUBLIC_KEY_PATH: z.string().min(1),
  JWT_ACCESS_EXPIRY: z.coerce.number().int().default(900),
  JWT_REFRESH_EXPIRY: z.coerce.number().int().default(604800),
  DATABASE_ENCRYPTION_KEY: z.string().length(64),     // 32 bytes as hex
  HASH_SALT: z.string().length(64),                   // 32 bytes as hex
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(14).default(12),

  // External Services — Firebase
  FCM_PROJECT_ID: z.string().min(1),
  FCM_PRIVATE_KEY: z.string().min(1),
  FCM_CLIENT_EMAIL: z.string().email(),

  // Africa's Talking
  AFRICASTALKING_API_KEY: z.string().min(1),
  AFRICASTALKING_USERNAME: z.string().min(1),
  AFRICASTALKING_SENDER_ID: z.string().default('PRMS-KE'),

  // SMTP
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().default(587),
  SMTP_USER: z.string().min(1),
  SMTP_PASSWORD: z.string().min(1),
  SMTP_FROM_ADDRESS: z.string().email(),
  SMTP_FROM_NAME: z.string().default('PRMS Kenya'),

  // CORS
  CORS_ALLOWED_ORIGINS: z.string().default('http://localhost:5173'),
});

// ─── Types ───────────────────────────────────────────────────────────────────

export type TEnvConfig = z.infer<typeof envSchema>;

// ─── Loader ──────────────────────────────────────────────────────────────────

function loadEnv(): TEnvConfig {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.errors
      .map((e) => `  ${e.path.join('.')}: ${e.message}`)
      .join('\n');
    throw new Error(
      `[Config] Environment validation failed. Missing or invalid variables:\n${errors}\n\nCopy .env.example to .env and fill in the values.`,
    );
  }

  return result.data;
}

// Singleton — parse once at startup
export const env = loadEnv();

// ─── Derived helpers ─────────────────────────────────────────────────────────

/**
 * Reads the JWT private key PEM from disk.
 * Called once during JWT config initialisation.
 */
export function loadJwtPrivateKey(): string {
  try {
    return readFileSync(env.JWT_PRIVATE_KEY_PATH, 'utf-8');
  } catch {
    throw new Error(
      `[Config] Cannot read JWT private key at: ${env.JWT_PRIVATE_KEY_PATH}. Run ./scripts/generate-keys.sh`,
    );
  }
}

/**
 * Reads the JWT public key PEM from disk.
 * Called once during JWT config initialisation.
 */
export function loadJwtPublicKey(): string {
  try {
    return readFileSync(env.JWT_PUBLIC_KEY_PATH, 'utf-8');
  } catch {
    throw new Error(
      `[Config] Cannot read JWT public key at: ${env.JWT_PUBLIC_KEY_PATH}. Run ./scripts/generate-keys.sh`,
    );
  }
}

/** Returns true when running in production. */
export const isProduction = (): boolean => env.NODE_ENV === 'production';

/** Returns true when running tests. */
export const isTest = (): boolean => env.NODE_ENV === 'test';

/** Parses CORS_ALLOWED_ORIGINS into an array. */
export const getAllowedOrigins = (): string[] =>
  env.CORS_ALLOWED_ORIGINS.split(',').map((o) => o.trim());
