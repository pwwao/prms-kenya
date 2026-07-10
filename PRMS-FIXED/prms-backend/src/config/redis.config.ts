/**
 * Redis Configuration — ioredis Client
 *
 * Provides a singleton Redis client and typed key helpers.
 * Architecture Contract §9.6 — Key naming patterns and TTLs.
 */

import Redis from 'ioredis';
import { env } from './env.config.js';
import { logger } from './logger.config.js';

// ─── TTL Constants (seconds) ──────────────────────────────────────────────────
// Architecture Contract §9.6

export const REDIS_TTL = {
  SESSION: 900,                  // 15 minutes
  REFRESH_TOKEN: 604_800,        // 7 days
  PRE_AUTH: 300,                 // 5 minutes
  SMS_OTP: 300,                  // 5 minutes — matches PRE_AUTH window
  PASSWORD_RESET: 900,           // 15 minutes
  RATE_LIMIT_AUTH: 900,          // 15 minutes
  RATE_LIMIT_2FA: 300,           // 5 minutes
  RATE_LIMIT_FORGOT_PWD: 3600,   // 60 minutes
  RATE_LIMIT_DEFAULT: 60,        // 1 minute
  CACHE_HOSPITAL: 300,           // 5 minutes
  CACHE_HOSPITAL_LIST: 120,      // 2 minutes
  CACHE_REFERRAL: 60,            // 1 minute
} as const;

// ─── Key Pattern Helpers ──────────────────────────────────────────────────────

export const RedisKeys = {
  session: (userId: number, deviceId: string): string =>
    `session:${userId}:${deviceId}`,

  refresh: (jti: string): string =>
    `refresh:${jti}`,

  preAuth: (tokenHash: string): string =>
    `pre_auth:${tokenHash}`,

  rateLimit: (endpoint: string, ip: string): string =>
    `rate_limit:${endpoint}:${ip}`,

  cacheHospital: (id: number): string =>
    `cache:hospital:${id}`,

  cacheHospitalList: (page: number, filters: string): string =>
    `cache:hospitals:list:${page}:${filters}`,

  cacheReferral: (id: number): string =>
    `cache:referral:${id}`,

  pubsubReferralChat: (referralId: number): string =>
    `pubsub:referral:${referralId}:chat`,

  notifQueueFcm: (): string => 'notif:queue:fcm',

  notifQueueSms: (): string => 'notif:queue:sms',

  blacklistToken: (jti: string): string =>
    `blacklist:token:${jti}`,

  smsOtp: (userId: number): string =>
    `sms_otp:${userId}`,

  passwordReset: (tokenHash: string): string =>
    `password_reset:${tokenHash}`,
} as const;

// ─── Client Factory ───────────────────────────────────────────────────────────

function createRedisClient(clientName: string): Redis {
  const client = new Redis({
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD || undefined,
    // Reconnect strategy: exponential backoff, max 30s
    retryStrategy: (times: number): number | null => {
      if (times > 10) {
        logger.error('Redis connection lost after 10 retries', {
          module: 'redis',
          client: clientName,
        });
        return null; // stop retrying
      }
      return Math.min(times * 200, 30_000);
    },
    enableOfflineQueue: true,
    maxRetriesPerRequest: 3,
    lazyConnect: false,
    // Keep-alive
    keepAlive: 10_000,
  });

  client.on('connect', () => {
    logger.info('Redis connected', { module: 'redis', client: clientName });
  });

  client.on('ready', () => {
    logger.debug('Redis ready', { module: 'redis', client: clientName });
  });

  client.on('error', (err: Error) => {
    logger.error('Redis error', {
      module: 'redis',
      client: clientName,
      errorMessage: err.message,
    });
  });

  client.on('close', () => {
    logger.warn('Redis connection closed', { module: 'redis', client: clientName });
  });

  return client;
}

// ─── Singleton Clients ────────────────────────────────────────────────────────

let redisClient: Redis | null = null;
let redisPubClient: Redis | null = null;
let redisSubClient: Redis | null = null;

/** Primary Redis client for cache, sessions, rate limiting. */
export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = createRedisClient('primary');
  }
  return redisClient;
}

/** Dedicated publish client (cannot share with subscribe). */
export function getRedisPubClient(): Redis {
  if (!redisPubClient) {
    redisPubClient = createRedisClient('publisher');
  }
  return redisPubClient;
}

/** Dedicated subscribe client (blocks on SUBSCRIBE command). */
export function getRedisSubClient(): Redis {
  if (!redisSubClient) {
    redisSubClient = createRedisClient('subscriber');
  }
  return redisSubClient;
}

/**
 * Verifies Redis connectivity.
 * Called during application startup.
 */
export async function verifyRedisConnection(): Promise<void> {
  const client = getRedisClient();
  const pong = await client.ping();
  if (pong !== 'PONG') {
    throw new Error('[Redis] Health check failed — unexpected PING response');
  }
  logger.info('Redis connection verified', { module: 'redis' });
}

/**
 * Gracefully disconnects all Redis clients.
 * Called during application shutdown.
 */
export async function closeRedisConnections(): Promise<void> {
  const clients = [redisClient, redisPubClient, redisSubClient].filter(Boolean) as Redis[];
  await Promise.all(clients.map((c) => c.quit()));
  redisClient = redisPubClient = redisSubClient = null;
  logger.info('Redis connections closed', { module: 'redis' });
}

// ─── Typed helpers ────────────────────────────────────────────────────────────

/** Sets a key with TTL and automatically serialises objects to JSON. */
export async function redisSet(
  key: string,
  value: unknown,
  ttlSeconds?: number,
): Promise<void> {
  const client = getRedisClient();
  const serialised = typeof value === 'string' ? value : JSON.stringify(value);
  if (ttlSeconds) {
    await client.setex(key, ttlSeconds, serialised);
  } else {
    await client.set(key, serialised);
  }
}

/** Gets a key and deserialises JSON if needed. */
export async function redisGet<T>(key: string): Promise<T | null> {
  const client = getRedisClient();
  const value = await client.get(key);
  if (value === null) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return value as unknown as T;
  }
}

/** Deletes one or more keys. */
export async function redisDel(...keys: string[]): Promise<void> {
  const client = getRedisClient();
  await client.del(...keys);
}

/** Publishes a domain event to a Redis channel. */
export async function redisPublish(channel: string, payload: unknown): Promise<void> {
  const pub = getRedisPubClient();
  await pub.publish(channel, JSON.stringify(payload));
}
