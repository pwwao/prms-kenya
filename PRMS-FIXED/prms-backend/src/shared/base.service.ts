/**
 * Base Service
 *
 * Architecture Contract §4.2 — Services within the same process communicate
 * via direct function calls. No HTTP between internal modules.
 *
 * Provides shared infrastructure: logging, event publishing, caching.
 * Business modules extend this class.
 */

import { redisPublish } from '../config/redis.config.js';
import { createModuleLogger } from '../config/logger.config.js';
import type winston from 'winston';

// ─── Domain Event Schema ──────────────────────────────────────────────────────
// Architecture Contract §13.1

export interface IDomainEvent<T = Record<string, unknown>> {
  eventId: string;
  eventType: string;
  occurredAt: string;
  version: '1.0';
  payload: T;
}

export abstract class BaseService {
  /** The module name — used for logging and event channels. */
  protected abstract readonly moduleName: string;

  private _logger: winston.Logger | null = null;

  /** Lazy-initialised module-scoped logger. */
  protected get logger(): winston.Logger {
    if (!this._logger) {
      this._logger = createModuleLogger(this.moduleName);
    }
    return this._logger;
  }

  // ─── Event publishing ──────────────────────────────────────────────────────

  /**
   * Publishes a domain event to Redis Pub/Sub.
   * Architecture Contract §13.1 — event schema.
   * Non-blocking: failures are logged but never propagate to the caller.
   *
   * @param eventType - UPPER_SNAKE_CASE event name
   * @param payload   - Event-specific data (no PII plaintext)
   */
  protected publishEvent<T extends Record<string, unknown>>(
    eventType: string,
    payload: T,
  ): void {
    const event: IDomainEvent<T> = {
      eventId: crypto.randomUUID(),
      eventType,
      occurredAt: new Date().toISOString(),
      version: '1.0',
      payload,
    };

    // Fire-and-forget — audit/notification services consume asynchronously
    redisPublish(`events:${eventType}`, event).catch((err: unknown) => {
      this.logger.error('Failed to publish domain event', {
        action: 'PUBLISH_EVENT',
        eventType,
        errorMessage: err instanceof Error ? err.message : String(err),
      });
    });
  }

  // ─── Logging helpers ───────────────────────────────────────────────────────

  /**
   * Logs a successful mutation (create/update/delete).
   * Architecture Contract §6.4 — info level for successful mutations.
   */
  protected logMutation(
    action: string,
    resourceId: number | string,
    userId?: number,
    extra?: Record<string, unknown>,
  ): void {
    this.logger.info(`${action} completed`, {
      action,
      resourceId,
      userId,
      ...extra,
    });
  }

  /**
   * Logs a cache hit.
   * Architecture Contract §6.4 — debug level for cache hits/misses.
   */
  protected logCacheHit(key: string): void {
    this.logger.debug('Cache hit', { action: 'CACHE_HIT', key });
  }

  /**
   * Logs a cache miss.
   */
  protected logCacheMiss(key: string): void {
    this.logger.debug('Cache miss', { action: 'CACHE_MISS', key });
  }
}
