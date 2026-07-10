
import type { Request, Response, NextFunction } from 'express';
import { getPrimaryPool } from '../config/database.config.js';
import { logger } from '../config/logger.config.js';

// ─── Action type mapping ──────────────────────────────────────────────────────

/** Maps HTTP method + path pattern to an audit action type. */
const METHOD_ACTION_MAP: Record<string, string> = {
  POST: 'CREATE',
  PATCH: 'UPDATE',
  PUT: 'UPDATE',
  DELETE: 'DELETE',
  GET: 'VIEW',
};

// ─── Middleware ───────────────────────────────────────────────────────────────

/**
 * Attaches a post-response hook that asynchronously writes an audit log entry.
 * Must be applied after `authenticate` middleware (needs req.user).
 *
 * Skipped for:
 * - GET requests to list endpoints (too noisy; use audit_patient_access for PII)
 * - Health check endpoint
 * - Static asset routes
 *
 * @param auditOptions - Optional overrides for action type and resource
 */
export function auditLog(options?: {
  actionType?: string;
  resourceType?: string;
  /** Function to extract the resource ID from the response. */
  getResourceId?: (req: Request, res: Response) => number | null;
}) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Skip health check and noisy GETs
    if (req.path === '/health' || (req.method === 'GET' && !options?.actionType)) {
      return next();
    }

    res.on('finish', () => {
      // Only audit 2xx and 4xx responses (not 5xx infrastructure errors)
      if (res.statusCode >= 500) return;

      const user = req.user;
      const actionType = options?.actionType
        ?? `${METHOD_ACTION_MAP[req.method] ?? req.method}_${deriveResourceType(req.path)}`;

      const resourceId = options?.getResourceId?.(req, res)
        ?? extractIdFromPath(req.path);

      // Fire-and-forget — non-blocking
      writeAuditLog({
        userId: user?.userId ?? null,
        actionType,
        ipAddress: getClientIp(req),
        userAgent: req.headers['user-agent'] ?? null,
        resourceType: options?.resourceType ?? deriveResourceType(req.path),
        resourceId,
        resourceAffected: `${req.method} ${req.path}`,
        payloadSnapshot: buildSnapshot(req, res),
        hospitalId: user?.hospitalId ?? null,
      }).catch((err: unknown) => {
        logger.error('Failed to write audit log', {
          module: 'audit',
          errorMessage: err instanceof Error ? err.message : String(err),
          path: req.path,
        });
      });
    });

    next();
  };
}

// ─── Writer ───────────────────────────────────────────────────────────────────

interface IAuditEntry {
  userId: number | null;
  actionType: string;
  ipAddress: string | null;
  userAgent: string | null;
  resourceType: string | null;
  resourceId: number | null;
  resourceAffected: string | null;
  payloadSnapshot: string | null;
  hospitalId: number | null;
}

async function writeAuditLog(entry: IAuditEntry): Promise<void> {
  const pool = getPrimaryPool();
  await pool.execute(
    `CALL sp_create_audit_log(?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      entry.userId,
      entry.actionType,
      entry.ipAddress,
      entry.userAgent,
      entry.resourceType,
      entry.resourceId,
      entry.resourceAffected,
      entry.payloadSnapshot,
      entry.hospitalId,
    ],
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function deriveResourceType(path: string): string {
  // Extract the first path segment after /api/v1/
  const match = /\/api\/v1\/([a-z-]+)/i.exec(path);
  return match?.[1]?.replace(/-/g, '_') ?? 'unknown';
}

function extractIdFromPath(path: string): number | null {
  // Matches patterns like /api/v1/referrals/123 or /api/v1/patients/456/something
  const match = /\/api\/v1\/[a-z-]+\/(\d+)/i.exec(path);
  if (!match) return null;
  const id = parseInt(match[1] ?? '', 10);
  return isNaN(id) ? null : id;
}

function getClientIp(req: Request): string | null {
  // Prefer X-Forwarded-For (set by Nginx) over socket address
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0]?.trim() ?? null;
  }
  return req.socket.remoteAddress ?? null;
}

function buildSnapshot(req: Request, res: Response): string | null {
  try {
    // Never snapshot request bodies for GET or auth endpoints (password fields, tokens)
    if (req.method === 'GET') return null;
    if (req.path.includes('/auth/')) return null;

    const snapshot = {
      statusCode: res.statusCode,
      method: req.method,
      path: req.path,
      // Only log body keys, never values — avoids PII in audit snapshot
      bodyKeys: req.body && typeof req.body === 'object'
        ? Object.keys(req.body as Record<string, unknown>)
        : [],
    };

    return JSON.stringify(snapshot);
  } catch {
    return null;
  }
}

// ─── Security event writer (called directly from auth service) ────────────────

export type TSecurityEventType =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILURE'
  | 'LOGOUT'
  | '2FA_SUCCESS'
  | '2FA_FAILURE'
  | 'TOKEN_REFRESH'
  | 'TOKEN_REVOKED'
  | 'PASSWORD_RESET_REQUEST'
  | 'PASSWORD_RESET_COMPLETE'
  | 'ACCOUNT_SUSPENDED'
  | 'ACCOUNT_ACTIVATED'
  | 'RATE_LIMIT_EXCEEDED';

/**
 * Writes a security event directly to audit_security_events.
 * Called from the Auth service — not from middleware.
 * Non-blocking: failures are logged but never propagate.
 */
export function writeSecurityEvent(event: {
  eventType: TSecurityEventType;
  userId?: number | null;
  identifier?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  hospitalId?: number | null;
  metadata?: Record<string, unknown>;
}): void {
  const pool = getPrimaryPool();

  pool
    .execute(
      `INSERT INTO audit_security_events
         (event_type, user_id, identifier, ip_address, user_agent, hospital_id, metadata_json)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        event.eventType,
        event.userId ?? null,
        event.identifier ?? null,
        event.ipAddress ?? null,
        event.userAgent ?? null,
        event.hospitalId ?? null,
        event.metadata ? JSON.stringify(event.metadata) : null,
      ],
    )
    .catch((err: unknown) => {
      logger.error('Failed to write security event', {
        module: 'audit',
        eventType: event.eventType,
        errorMessage: err instanceof Error ? err.message : String(err),
      });
    });
}
