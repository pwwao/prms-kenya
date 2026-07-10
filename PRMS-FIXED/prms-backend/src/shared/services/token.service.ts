/**
 * Token Service — JWT Issue / Verify / Refresh / Revoke
 *
 * Architecture Contract §10.2 — RS256, 15min access, 7d refresh, jti blacklist.
 * Uses jsonwebtoken for sign/verify; public key verification allows stateless check.
 * Redis blacklist enforces token revocation on logout.
 */

import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { getJwtConfig, type IJwtPayload, type IPreAuthPayload, type TUserRole } from '../../config/jwt.config.js';
import { getRedisClient, RedisKeys, REDIS_TTL } from '../../config/redis.config.js';
import { AuthError } from '../errors/domain.errors.js';
import { logger } from '../../config/logger.config.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ITokenPair {
  accessToken: string;
  refreshToken: string;
  accessExpiresIn: number;
}

export interface IVerifiedToken extends IJwtPayload {
  /** Raw jti extracted from the token */
  jti: string;
}

// ─── Issue ────────────────────────────────────────────────────────────────────

/**
 * Issues an access + refresh token pair for an authenticated user.
 * Called after successful login (and 2FA if enabled).
 *
 * @param userId     - Database user ID
 * @param role       - User's RBAC role
 * @param hospitalId - Hospital ID from users table (null for System Admin)
 */
export function issueTokenPair(
  userId: number,
  role: TUserRole,
  hospitalId: number | null,
): ITokenPair {
  const config = getJwtConfig();
  const now = Math.floor(Date.now() / 1000);

  const accessPayload: Omit<IJwtPayload, 'iat' | 'exp'> = {
    sub: String(userId),
    role,
    hospitalId,
    jti: uuidv4(),
  };

  const accessToken = jwt.sign(accessPayload, config.privateKey, {
    algorithm: config.algorithm,
    expiresIn: config.accessExpirySeconds,
    issuer: config.issuer,
    audience: config.audience,
  });

  const refreshPayload = {
    sub: String(userId),
    type: 'refresh' as const,
    jti: uuidv4(),
  };

  const refreshToken = jwt.sign(refreshPayload, config.privateKey, {
    algorithm: config.algorithm,
    expiresIn: config.refreshExpirySeconds,
    issuer: config.issuer,
    audience: config.audience,
  });

  return {
    accessToken,
    refreshToken,
    accessExpiresIn: config.accessExpirySeconds,
  };
}

/**
 * Issues a short-lived pre-auth token for the 2FA challenge step.
 * Stored in Redis with a 5-minute TTL.
 *
 * @param userId - The user who passed password check but hasn't completed 2FA
 * @returns Pre-auth token string
 */
export async function issuePreAuthToken(userId: number): Promise<string> {
  const config = getJwtConfig();
  const jti = uuidv4();

  const payload: Omit<IPreAuthPayload, 'iat' | 'exp'> = {
    userId,
    type: 'pre_auth',
    jti,
  };

  const token = jwt.sign(payload, config.privateKey, {
    algorithm: config.algorithm,
    expiresIn: REDIS_TTL.PRE_AUTH,
    issuer: config.issuer,
    audience: config.audience,
  });

  const redis = getRedisClient();
  await redis.setex(
    RedisKeys.preAuth(jti),
    REDIS_TTL.PRE_AUTH,
    String(userId),
  );

  return token;
}

// ─── Verify ───────────────────────────────────────────────────────────────────

/**
 * Verifies and decodes an access token.
 * Checks: signature, expiry, issuer, audience, blacklist.
 *
 * @throws AuthError with specific code on any failure
 */
export async function verifyAccessToken(token: string): Promise<IVerifiedToken> {
  const config = getJwtConfig();

  let decoded: IJwtPayload;
  try {
    decoded = jwt.verify(token, config.publicKey, {
      algorithms: [config.algorithm],
      issuer: config.issuer,
      audience: config.audience,
    }) as IJwtPayload;
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new AuthError('Access token has expired', 'AUTH_TOKEN_EXPIRED');
    }
    throw new AuthError('Access token is invalid', 'AUTH_TOKEN_INVALID');
  }

  // Check Redis blacklist — revoked on logout
  const redis = getRedisClient();
  const isBlacklisted = await redis.exists(RedisKeys.blacklistToken(decoded.jti));
  if (isBlacklisted) {
    throw new AuthError('Token has been revoked', 'AUTH_TOKEN_INVALID');
  }

  return decoded as IVerifiedToken;
}

/**
 * Verifies and decodes a refresh token.
 *
 * @throws AuthError on expiry or invalidity
 */
export function verifyRefreshToken(token: string): { sub: string; jti: string } {
  const config = getJwtConfig();
  try {
    const decoded = jwt.verify(token, config.publicKey, {
      algorithms: [config.algorithm],
      issuer: config.issuer,
      audience: config.audience,
    }) as { sub: string; jti: string; type: string };

    if (decoded.type !== 'refresh') {
      throw new AuthError('Invalid token type', 'AUTH_TOKEN_INVALID');
    }

    return { sub: decoded.sub, jti: decoded.jti };
  } catch (err) {
    if (err instanceof AuthError) throw err;
    if (err instanceof jwt.TokenExpiredError) {
      throw new AuthError('Refresh token has expired', 'AUTH_REFRESH_TOKEN_EXPIRED');
    }
    throw new AuthError('Refresh token is invalid', 'AUTH_TOKEN_INVALID');
  }
}

/**
 * Verifies a pre-auth token and returns the associated userId from Redis.
 * Deletes the Redis key on success (single-use).
 *
 * @throws AuthError if token is invalid, expired, or already used
 */
export async function verifyPreAuthToken(token: string): Promise<number> {
  const config = getJwtConfig();

  let decoded: IPreAuthPayload;
  try {
    decoded = jwt.verify(token, config.publicKey, {
      algorithms: [config.algorithm],
      issuer: config.issuer,
      audience: config.audience,
    }) as IPreAuthPayload;
  } catch {
    throw new AuthError('Pre-auth token is invalid or expired', 'AUTH_TOKEN_INVALID');
  }

  if (decoded.type !== 'pre_auth') {
    throw new AuthError('Invalid token type', 'AUTH_TOKEN_INVALID');
  }

  const redis = getRedisClient();
  const storedUserId = await redis.get(RedisKeys.preAuth(decoded.jti));

  if (!storedUserId || Number(storedUserId) !== decoded.userId) {
    throw new AuthError('Pre-auth token not found or already used', 'AUTH_TOKEN_INVALID');
  }

  // Single-use — delete immediately
  await redis.del(RedisKeys.preAuth(decoded.jti));

  return decoded.userId;
}

// ─── Revoke ───────────────────────────────────────────────────────────────────

/**
 * Blacklists an access token's jti in Redis until its natural expiry.
 * Called on logout to prevent token reuse within the 15-minute window.
 *
 * @param jti       - The jti claim from the token
 * @param expiresAt - Unix timestamp when the token expires (to set correct TTL)
 */
export async function revokeAccessToken(jti: string, expiresAt: number): Promise<void> {
  const redis = getRedisClient();
  const ttlSeconds = Math.max(expiresAt - Math.floor(Date.now() / 1000), 1);
  await redis.setex(RedisKeys.blacklistToken(jti), ttlSeconds, '1');
  logger.debug('Access token revoked', { module: 'token', jti });
}

/**
 * Records a session in Redis.
 * Used to validate that a session is still active.
 */
export async function registerSession(
  userId: number,
  deviceId: string,
  role: TUserRole,
): Promise<void> {
  const redis = getRedisClient();
  await redis.setex(
    RedisKeys.session(userId, deviceId),
    REDIS_TTL.SESSION,
    JSON.stringify({ userId, role }),
  );
}

/**
 * Removes a user session from Redis on logout.
 */
export async function destroySession(userId: number, deviceId: string): Promise<void> {
  const redis = getRedisClient();
  await redis.del(RedisKeys.session(userId, deviceId));
}
