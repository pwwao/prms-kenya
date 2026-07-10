/**
 * Platform Barrel — Public API for Business Modules
 *
 * Business module teams import from '@prms/platform' (mapped to this file
 * via tsconfig paths). This prevents direct dependency on internal paths
 * and gives the platform team control over the public surface.
 *
 * Convention:
 *   import { BaseRepository, validate, authenticate } from '@prms/platform';
 */

// ── Config ────────────────────────────────────────────────────────────────────
export { env, isProduction, isTest } from './config/env.config.js';
export { logger, createModuleLogger, logError } from './config/logger.config.js';
export { execute, withTransaction, getConnection } from './config/database.config.js';
export {
  getRedisClient,
  RedisKeys,
  REDIS_TTL,
  redisGet,
  redisSet,
  redisDel,
  redisPublish,
} from './config/redis.config.js';

// ── Errors ────────────────────────────────────────────────────────────────────
export { AppError } from './shared/errors/app.error.js';
export type { TErrorCode, IErrorDetail } from './shared/errors/app.error.js';
export {
  ValidationError,
  AuthError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  InvalidStateError,
  EncryptionError,
  ExternalServiceError,
} from './shared/errors/domain.errors.js';

// ── Shared services ───────────────────────────────────────────────────────────
export { encrypt, decrypt, encryptNullable, decryptNullable } from './shared/services/crypto.service.js';
export {
  hashForIndex,
  hashForIndexNullable,
  hashNationalId,
  hashFullName,
  hashPhone,
  normaliseNationalId,
  normaliseFullName,
  normalisePhone,
} from './shared/services/hash.service.js';
export {
  issueTokenPair,
  issuePreAuthToken,
  verifyAccessToken,
  verifyRefreshToken,
  verifyPreAuthToken,
  revokeAccessToken,
  registerSession,
  destroySession,
} from './shared/services/token.service.js';
export { getOrSet, invalidate, invalidatePattern, prime } from './shared/services/cache.service.js';
export {
  getFcmQueue,
  getSmsQueue,
  getEmailQueue,
  enqueueFcm,
  enqueueSms,
  enqueueEmail,
} from './shared/queue/queue.ts';

// ── Base patterns ─────────────────────────────────────────────────────────────
export { BaseRepository } from './shared/base.repository.js';
export { BaseService } from './shared/base.service.js';
export { BaseGateway, SocketRooms, registerSocketAuth } from './shared/base.gateway.js';
export type { ISocketUser } from './shared/base.gateway.js';

// ── Response & pagination ─────────────────────────────────────────────────────
export {
  sendSuccess,
  sendCreated,
  sendNoContent,
  sendError,
} from './shared/response.helper.js';
export type { IPagination, ISuccessResponse, IErrorResponse } from './shared/response.helper.js';
export {
  parsePagination,
  buildPagination,
  safeSortBy,
} from './shared/pagination.helper.js';
export type { IPaginationParams } from './shared/pagination.helper.js';

// ── Common schemas ────────────────────────────────────────────────────────────
export * from './shared/schemas/common.schemas.js';

// ── Middleware ────────────────────────────────────────────────────────────────
export { authenticate, authenticateOptional } from './middleware/authenticate.middleware.js';
export type { IAuthenticatedUser } from './middleware/authenticate.middleware.js';
export {
  authorize,
  requirePermission,
  enforceFacilityIsolation,
  assertFacilityAccess,
  hasPermission,
} from './middleware/authorize.middleware.js';
export type { TPermission } from './middleware/authorize.middleware.js';
export { validate, validateMany } from './middleware/validate.middleware.js';
export { auditLog, writeSecurityEvent } from './middleware/audit.middleware.js';
export type { TSecurityEventType } from './middleware/audit.middleware.js';
export {
  loginRateLimiter,
  verify2faRateLimiter,
  forgotPasswordRateLimiter,
  defaultApiRateLimiter,
  reportRateLimiter,
} from './middleware/rate-limit.middleware.js';

// ── Types ─────────────────────────────────────────────────────────────────────
export type { TUserRole, IJwtPayload } from './config/jwt.config.js';
export type { IDomainEvent } from './shared/base.service.js';
