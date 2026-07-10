
import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../shared/errors/app.error.js';
import { sendError } from '../shared/response.helper.js';
import { logger, logError } from '../config/logger.config.js';
import { isProduction } from '../config/env.config.js';

// ─── MySQL error codes ────────────────────────────────────────────────────────

const MYSQL_DUPLICATE_ENTRY = 'ER_DUP_ENTRY';
const MYSQL_FK_CONSTRAINT = 'ER_ROW_IS_REFERENCED_2';

// ─── Handler ──────────────────────────────────────────────────────────────────

/**
 * Express 4-argument error handler.
 * Registered LAST in app.ts.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function globalErrorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const requestId = (res.locals.requestId as string | undefined) ?? 'unknown';

  // ── Known operational errors (AppError subclasses) ──────────────────────────
  if (err instanceof AppError) {
    const isServerError = err.statusCode >= 500;

    if (isServerError) {
      logError(err, {
        requestId,
        userId: req.user?.userId,
        module: 'error-handler',
        action: 'UNHANDLED_APP_ERROR',
        message: err.message,
      });
    } else {
      // Business/validation errors — warn level
      logger.warn(err.message, {
        requestId,
        userId: req.user?.userId,
        module: 'error-handler',
        code: err.code,
        statusCode: err.statusCode,
      });
    }

    sendError(res, err.statusCode, err.code, err.message, err.details);
    return;
  }

  // ── MySQL duplicate entry ──────────────────────────────────────────────────
  if (isMyqlError(err) && err.code === MYSQL_DUPLICATE_ENTRY) {
    logger.warn('Duplicate entry conflict', {
      requestId,
      module: 'error-handler',
      sqlMessage: err.sqlMessage,
    });
    sendError(res, 409, 'RESOURCE_ALREADY_EXISTS', 'A resource with this identifier already exists');
    return;
  }

  // ── MySQL FK constraint (delete blocked by related rows) ───────────────────
  if (isMyqlError(err) && err.code === MYSQL_FK_CONSTRAINT) {
    logger.warn('FK constraint violation', {
      requestId,
      module: 'error-handler',
      sqlMessage: err.sqlMessage,
    });
    sendError(res, 409, 'RESOURCE_ALREADY_EXISTS', 'Cannot modify resource: related records exist');
    return;
  }

  // ── Unexpected / programmer errors ─────────────────────────────────────────
  logError(err, {
    requestId,
    userId: req.user?.userId,
    module: 'error-handler',
    action: 'UNHANDLED_EXCEPTION',
    message: 'Unhandled exception reached global error handler',
    method: req.method,
    path: req.path,
  });

  // Never expose internal details in production
  const message = isProduction()
    ? 'An internal server error occurred. Please try again later.'
    : err instanceof Error
      ? err.message
      : 'Unknown error';

  sendError(res, 500, 'INTERNAL_SERVER_ERROR', message);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface IMysqlError extends Error {
  code: string;
  sqlMessage?: string;
}

function isMyqlError(err: unknown): err is IMysqlError {
  return (
    err instanceof Error &&
    'code' in err &&
    typeof (err as IMysqlError).code === 'string'
  );
}

// ─── 404 Handler — registered before globalErrorHandler ──────────────────────

/**
 * Catches requests that matched no route and returns a structured 404.
 * Register this AFTER all routes, BEFORE globalErrorHandler.
 */
export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(
    new AppError(
      `Route ${req.method} ${req.path} not found`,
      404,
      'RESOURCE_NOT_FOUND',
    ),
  );
}
