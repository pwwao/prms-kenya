/**
 * JWT Configuration — RS256 Asymmetric Tokens
 *
 * Architecture Contract §10.2 — JWT specification, claims, expiry.
 * Uses Node.js built-in `crypto` for RS256 sign/verify (no external jwt lib needed
 * beyond what token.service.ts implements using jsonwebtoken).
 */

import { env, loadJwtPrivateKey, loadJwtPublicKey } from './env.config.js';

// ─── JWT Claim Types ──────────────────────────────────────────────────────────

export type TUserRole = 'System Admin' | 'Hospital Admin' | 'Clinician' | 'Receptionist';

export interface IJwtPayload {
  /** User ID as string — Architecture Contract §10.2 */
  sub: string;
  /** User role */
  role: TUserRole;
  /** Hospital ID — null for System Admin */
  hospitalId: number | null;
  /** Issued at (Unix timestamp) */
  iat: number;
  /** Expires at (Unix timestamp) */
  exp: number;
  /** JWT ID — UUID v4 used for blacklisting */
  jti: string;
}

export interface IPreAuthPayload {
  /** User ID awaiting 2FA */
  userId: number;
  /** Token type discriminator */
  type: 'pre_auth';
  /** Issued at */
  iat: number;
  /** Expires at — 5 minute window */
  exp: number;
  /** Token ID for Redis lookup */
  jti: string;
}

// ─── JWT Config Singleton ─────────────────────────────────────────────────────

interface IJwtConfig {
  algorithm: 'RS256';
  privateKey: string;
  publicKey: string;
  accessExpirySeconds: number;
  refreshExpirySeconds: number;
  issuer: string;
  audience: string;
}

let jwtConfig: IJwtConfig | null = null;

/**
 * Returns JWT configuration, loading key files on first call.
 * Fails fast if key files are missing.
 */
export function getJwtConfig(): IJwtConfig {
  if (!jwtConfig) {
    jwtConfig = {
      algorithm: 'RS256',
      privateKey: loadJwtPrivateKey(),
      publicKey: loadJwtPublicKey(),
      accessExpirySeconds: env.JWT_ACCESS_EXPIRY,
      refreshExpirySeconds: env.JWT_REFRESH_EXPIRY,
      issuer: 'prms.health.go.ke',
      audience: 'prms-clients',
    };
  }
  return jwtConfig;
}
