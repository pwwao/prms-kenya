/**
 * Cache Service — Typed Redis Cache Wrapper
 *
 * Architecture Contract §9.6 — all cache keys, TTLs, and invalidation patterns.
 * Business modules use this service instead of calling Redis directly.
 * Provides cache-aside pattern with type safety.
 */

import { redisGet, redisSet, redisDel, getRedisClient } from '../../config/redis.config.js';
import { createModuleLogger } from '../../config/logger.config.js';

const logger = createModuleLogger('cache');

// ─── Cache Service (class) ────────────────────────────────────────────────────
//
// INTEGRATION TEAM FIX: every business module's service/routes file
// (hospitals, patients, referrals, users, auth) does `new CacheService()`
// and calls `.get()`/`.set()`/`.del()` as instance methods — that
// expectation predates this fix (present in the original Core Business
// Modules submission) and was propagated into the new auth module by
// following the same established pattern. This file originally only
// exported standalone functions (getOrSet/invalidate/invalidatePattern/
// prime, kept below, unchanged, in case anything uses them directly).
// This class is a thin wrapper giving the instance-method interface every
// consumer actually expects, implemented on top of those same functions.

export class CacheService {
  async get<T>(key: string): Promise<T | null> {
    return redisGet<T>(key);
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    await redisSet(key, value, ttlSeconds);
  }

  async del(...keys: string[]): Promise<void> {
    await redisDel(...keys);
  }

  async getOrSet<T>(key: string, ttl: number, fetcher: () => Promise<T>): Promise<T> {
    return getOrSet<T>(key, ttl, fetcher);
  }

  async invalidatePattern(pattern: string): Promise<void> {
    return invalidatePattern(pattern);
  }
}

// ─── Standalone functional API (unchanged, kept for any direct callers) ──────

/**
 * Gets a cached value, or computes and stores it if absent.
 * Classic cache-aside pattern.
 *
 * @param key        - Redis key
 * @param ttl        - TTL in seconds
 * @param fetcher    - Async function to compute the value on cache miss
 * @returns Cached or freshly computed value
 *
 * @example
 * const hospital = await getOrSet(
 *   RedisKeys.cacheHospital(id),
 *   REDIS_TTL.CACHE_HOSPITAL,
 *   () => hospitalRepository.findById(id),
 * );
 */
export async function getOrSet<T>(
  key: string,
  ttl: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const cached = await redisGet<T>(key);

  if (cached !== null) {
    logger.debug('Cache hit', { action: 'CACHE_HIT', key });
    return cached;
  }

  logger.debug('Cache miss', { action: 'CACHE_MISS', key });
  const value = await fetcher();
  await redisSet(key, value, ttl);
  return value;
}

/**
 * Invalidates a single cache key.
 *
 * @example
 * await invalidate(RedisKeys.cacheHospital(hospitalId));
 */
export async function invalidate(key: string): Promise<void> {
  await redisDel(key);
  logger.debug('Cache invalidated', { action: 'CACHE_INVALIDATE', key });
}

/**
 * Invalidates all keys matching a pattern using SCAN (non-blocking).
 * Use for bulk invalidation (e.g. all hospital list cache entries).
 *
 * @example
 * await invalidatePattern('cache:hospitals:list:*');
 */
export async function invalidatePattern(pattern: string): Promise<void> {
  const client = getRedisClient();
  let cursor = '0';
  let totalDeleted = 0;

  do {
    const [nextCursor, keys] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
    cursor = nextCursor;

    if (keys.length > 0) {
      await client.del(...keys);
      totalDeleted += keys.length;
    }
  } while (cursor !== '0');

  logger.debug('Cache pattern invalidated', {
    action: 'CACHE_INVALIDATE_PATTERN',
    pattern,
    totalDeleted,
  });
}

/**
 * Stores a value in cache unconditionally.
 * Use after mutations to eagerly prime the cache.
 */
export async function prime<T>(key: string, value: T, ttl: number): Promise<void> {
  await redisSet(key, value, ttl);
  logger.debug('Cache primed', { action: 'CACHE_PRIME', key });
}
