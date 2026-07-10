/**
 * Base Application Error
 *
 * All domain errors extend this class.
 * Architecture Contract §6.3 — Error hierarchy.
 * Global error handler middleware catches AppError instances
 * and transforms them into the standard API response envelope.
 */

// ─── Approved error codes ─────────────────────────────────────────────────────
// Architecture Contract §8.3 — no inventing new codes without approval

export type TErrorCode =
  // Auth
  | 'AUTH_INVALID_CREDENTIALS'
  | 'AUTH_TOKEN_EXPIRED'
  | 'AUTH_TOKEN_INVALID'
  | 'AUTH_REFRESH_TOKEN_EXPIRED'
  | 'AUTH_2FA_REQUIRED'
  | 'AUTH_2FA_INVALID_OTP'
  | 'AUTH_ACCOUNT_SUSPENDED'
  | 'AUTH_ACCOUNT_INACTIVE'
  | 'AUTH_INSUFFICIENT_PERMISSIONS'
  | 'AUTH_HOSPITAL_SUSPENDED'
  // Validation
  | 'VALIDATION_ERROR'
  | 'VALIDATION_REQUIRED_FIELD'
  | 'VALIDATION_INVALID_FORMAT'
  // Resource
  | 'RESOURCE_NOT_FOUND'
  | 'RESOURCE_ALREADY_EXISTS'
  | 'RESOURCE_SUSPENDED'
  | 'RESOURCE_INVALID_STATE_TRANSITION'
  // Encryption
  | 'ENCRYPTION_FAILURE'
  | 'DECRYPTION_FAILURE'
  | 'HASH_FAILURE'
  // External services
  | 'EXTERNAL_SERVICE_FCM_UNAVAILABLE'
  | 'EXTERNAL_SERVICE_SMS_UNAVAILABLE'
  | 'EXTERNAL_SERVICE_EMAIL_UNAVAILABLE'
  // Infrastructure
  | 'RATE_LIMIT_EXCEEDED'
  | 'DATABASE_CONNECTION_ERROR'
  | 'INTERNAL_SERVER_ERROR';

export interface IErrorDetail {
  field?: string;
  message: string;
}

/**
 * Base error class for all PRMS application errors.
 * Carries HTTP status, machine-readable error code, and optional field details.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: TErrorCode;
  public readonly details: IErrorDetail[];
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number,
    code: TErrorCode,
    details: IErrorDetail[] = [],
    isOperational = true,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = isOperational;

    // Restore prototype chain (required when extending built-ins in TypeScript)
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}
