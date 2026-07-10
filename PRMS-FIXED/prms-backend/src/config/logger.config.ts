/**
 * Logger Configuration — Winston
 *
 * Structured JSON logs with standard fields per Architecture Contract §6.4.
 * Transports: Console (all envs) + rotating file (production).
 */

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { env, isProduction, isTest } from './env.config.js';

// ─── Log field interface ──────────────────────────────────────────────────────

export interface ILogMeta {
  requestId?: string;
  userId?: number | null;
  module?: string;
  action?: string;
  [key: string]: unknown;
}

// ─── Custom format ────────────────────────────────────────────────────────────

const jsonFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

const devFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, requestId, module: mod, ...meta }) => {
    const reqId = requestId ? ` [${String(requestId).substring(0, 8)}]` : '';
    const modStr = mod ? ` (${String(mod)})` : '';
    const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
    return `${String(timestamp)} ${level}${reqId}${modStr}: ${String(message)}${metaStr}`;
  }),
);

// ─── Transports ───────────────────────────────────────────────────────────────

const transports: winston.transport[] = [];

// Console transport — always on except in test
if (!isTest()) {
  transports.push(
    new winston.transports.Console({
      format: isProduction() ? jsonFormat : devFormat,
    }),
  );
}

// File transports — production only
if (isProduction()) {
  transports.push(
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxFiles: '30d',
      maxSize: '100m',
      format: jsonFormat,
    }),
    new DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '14d',
      maxSize: '200m',
      format: jsonFormat,
    }),
  );
}

// ─── Logger instance ──────────────────────────────────────────────────────────

export const logger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  defaultMeta: { service: 'prms-api' },
  transports,
  // Prevent process exit on unhandled exception — PM2 handles restarts
  exitOnError: false,
});

// ─── Typed logger helpers ─────────────────────────────────────────────────────

/**
 * Creates a child logger scoped to a specific module.
 * All child log entries inherit the module field.
 */
export function createModuleLogger(moduleName: string): winston.Logger {
  return logger.child({ module: moduleName });
}

/**
 * Logs a structured error with full context.
 * Automatically extracts stack trace from Error objects.
 */
export function logError(
  error: unknown,
  context: ILogMeta & { message?: string },
): void {
  const { message = 'An error occurred', ...meta } = context;
  if (error instanceof Error) {
    logger.error(message, {
      ...meta,
      errorMessage: error.message,
      stack: error.stack,
    });
  } else {
    logger.error(message, { ...meta, error });
  }
}
