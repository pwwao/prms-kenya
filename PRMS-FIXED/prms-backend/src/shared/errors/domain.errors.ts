/**
 * Domain Error Classes
 *
 * Architecture Contract §6.3 — Error hierarchy:
 *   AppError
 *   ├── ValidationError    (HTTP 400)
 *   ├── AuthError          (HTTP 401)
 *   ├── ForbiddenError     (HTTP 403)
 *   ├── NotFoundError      (HTTP 404)
 *   ├── ConflictError      (HTTP 409)
 *   ├── InvalidStateError  (HTTP 422)
 *   ├── EncryptionError    (HTTP 500 — logged as CRITICAL)
 *   └── ExternalServiceError (HTTP 503)
 */

import { AppError, type IErrorDetail, type TErrorCode } from './app.error.js';

// ─── HTTP 400 — Validation ────────────────────────────────────────────────────

export class ValidationError extends AppError {
  constructor(
    message = 'Validation failed for request',
    details: IErrorDetail[] = [],
    code: TErrorCode = 'VALIDATION_ERROR',
  ) {
    super(message, 400, code, details);
  }
}

// ─── HTTP 401 — Authentication ────────────────────────────────────────────────

export class AuthError extends AppError {
  constructor(
    message: string,
    code: TErrorCode = 'AUTH_TOKEN_INVALID',
    details: IErrorDetail[] = [],
  ) {
    super(message, 401, code, details);
  }
}

// ─── HTTP 403 — Authorisation ─────────────────────────────────────────────────

export class ForbiddenError extends AppError {
  constructor(
    message = 'You do not have permission to perform this action',
    code: TErrorCode = 'AUTH_INSUFFICIENT_PERMISSIONS',
    details: IErrorDetail[] = [],
  ) {
    super(message, 403, code, details);
  }
}

// ─── HTTP 404 — Not Found ─────────────────────────────────────────────────────

export class NotFoundError extends AppError {
  constructor(
    resource: string,
    details: IErrorDetail[] = [],
  ) {
    super(`${resource} not found`, 404, 'RESOURCE_NOT_FOUND', details);
  }
}

// ─── HTTP 409 — Conflict ──────────────────────────────────────────────────────

export class ConflictError extends AppError {
  constructor(
    message: string,
    details: IErrorDetail[] = [],
  ) {
    super(message, 409, 'RESOURCE_ALREADY_EXISTS', details);
  }
}

// ─── HTTP 422 — Invalid State Transition ─────────────────────────────────────

export class InvalidStateError extends AppError {
  constructor(
    message: string,
    details: IErrorDetail[] = [],
  ) {
    super(message, 422, 'RESOURCE_INVALID_STATE_TRANSITION', details);
  }
}

// ─── HTTP 500 — Encryption Failure ───────────────────────────────────────────

export class EncryptionError extends AppError {
  constructor(
    operation: 'encrypt' | 'decrypt' | 'hash',
    cause?: unknown,
  ) {
    const code: TErrorCode =
      operation === 'encrypt'
        ? 'ENCRYPTION_FAILURE'
        : operation === 'decrypt'
          ? 'DECRYPTION_FAILURE'
          : 'HASH_FAILURE';

    // Do NOT include cause details in message — avoid leaking crypto internals
    super(
      `A cryptographic operation failed. Please contact support.`,
      500,
      code,
      [],
      false, // non-operational — always log stack
    );

    // Attach original error for internal logging only
    if (cause instanceof Error) {
      this.stack = `${this.stack ?? ''}\nCaused by: ${cause.stack ?? cause.message}`;
    }
  }
}

// ─── HTTP 503 — External Service ─────────────────────────────────────────────

export class ExternalServiceError extends AppError {
  constructor(
    service: 'FCM' | 'SMS' | 'EMAIL',
    message?: string,
  ) {
    const codeMap: Record<string, TErrorCode> = {
      FCM: 'EXTERNAL_SERVICE_FCM_UNAVAILABLE',
      SMS: 'EXTERNAL_SERVICE_SMS_UNAVAILABLE',
      EMAIL: 'EXTERNAL_SERVICE_EMAIL_UNAVAILABLE',
    };
    super(
      message ?? `External service ${service} is temporarily unavailable`,
      503,
      codeMap[service] ?? 'INTERNAL_SERVER_ERROR',
    );
  }
}
