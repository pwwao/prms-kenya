import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { getRedisClient } from '../config/redis.config.js';
import { logger } from '../config/logger.config.js';
import type { Request, Response } from 'express';

// ─── Store factory ────────────────────────────────────────────────────────────

function createRedisStore(prefix: string): RedisStore {
  return new RedisStore({
    // @ts-expect-error — rate-limit-redis sendCommand type mismatch with ioredis
    sendCommand: (...args: string[]) => getRedisClient().call(...args),
    prefix: `rate_limit:${prefix}:`,
  });
}

// ─── Rate limiter factory ─────────────────────────────────────────────────────

interface IRateLimitOptions {
  /** Maximum requests allowed in the window */
  max: number;
  /** Window duration in seconds */
  windowSeconds: number;
  /** Prefix for the Redis key — use endpoint name */
  keyPrefix: string;
  /** Custom message (optional) */
  message?: string;
  /** Skip successful requests (useful for failed login counting) */
  skipSuccessfulRequests?: boolean;
}

function createLimiter(options: IRateLimitOptions): ReturnType<typeof rateLimit> {
  return rateLimit({
    windowMs: options.windowSeconds * 1000,
    max: options.max,
    standardHeaders: true,     // Return RateLimit-* headers
    legacyHeaders: false,
    store: createRedisStore(options.keyPrefix),
    skipSuccessfulRequests: options.skipSuccessfulRequests ?? false,
    handler: (req, res) => {
      logger.warn('Rate limit exceeded', {
        module: 'rate-limit',
        ip: req.ip,
        path: req.path,
        userId: req.user?.userId,
      });
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: options.message ?? 'Too many requests. Please try again later.',
          details: [],
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: res.locals.requestId as string ?? 'unknown',
        },
      });
    },
  });
}

// ─── Configured limiters — Architecture Contract §8.6 ────────────────────────

/**
 * POST /auth/login — 5 attempts per 15 minutes.
 * Only counts failed requests to avoid blocking legitimate users.
 */
export const loginRateLimiter = createLimiter({
  max: 805,
  windowSeconds: 900, // 15 min
  keyPrefix: 'auth:login',
  message: 'Too many login attempts. Please wait 15 minutes before trying again.',
  skipSuccessfulRequests: true,
});

/**
 * POST /auth/verify-2fa — 3 attempts per 5 minutes.
 */
export const verify2faRateLimiter = createLimiter({
  max: 3,
  windowSeconds: 300, // 5 min
  keyPrefix: 'auth:2fa',
  message: 'Too many 2FA attempts. Please wait 5 minutes.',
  skipSuccessfulRequests: true,
});

/**
 * POST /auth/forgot-password — 3 attempts per 60 minutes.
 */
export const forgotPasswordRateLimiter = createLimiter({
  max: 3,
  windowSeconds: 3600, // 60 min
  keyPrefix: 'auth:forgot',
  message: 'Too many password reset requests. Please wait 1 hour.',
});

/**
 * All other authenticated APIs — 200 requests per 1 minute.
 * Applied globally after auth middleware.
 */
export const defaultApiRateLimiter = createLimiter({
  max: 200,
  windowSeconds: 60,
  keyPrefix: 'api:default',
});

/**
 * Report generation endpoints — 10 requests per 1 minute.
 */
export const reportRateLimiter = createLimiter({
  max: 10,
  windowSeconds: 60,
  keyPrefix: 'api:reports',
  message: 'Report generation is limited to 10 requests per minute.',
});