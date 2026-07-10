/**
 * Audit Logs Routes — GET /api/v1/audit-logs
 * Architecture Contract §8.7 / OpenAPI v1.0
 *
 * Read-only. System Admin only.
 * Write path is handled by audit.middleware.ts → sp_create_audit_log.
 *
 * Response shape matches web admin AuditLog type (src/types/audit.types.ts):
 *   { id, user: {id, username, role}|null, actionType, ipAddress, userAgent,
 *     resourceAffected, payloadSnapshot, timestamp }
 *
 * Query params match web AuditLogParams:
 *   { userId?, actionType?, startDate?, endDate?, ip?, page?, limit? }
 */

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate.middleware.js';
import { authorize } from '../../middleware/authorize.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { sendSuccess } from '../../shared/response.helper.js';
import { parsePagination, buildPagination } from '../../shared/pagination.helper.js';
import { BaseRepository } from '../../shared/base.repository.js';
import type mysql from 'mysql2/promise';

// ─── Validation ───────────────────────────────────────────────────────────────

const auditLogsQuerySchema = z.object({
  userId:     z.coerce.number().int().positive().optional(),
  actionType: z.string().trim().max(100).optional(),
  startDate:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  ip:         z.string().trim().max(45).optional(),
  page:       z.coerce.number().int().min(1).default(1),
  limit:      z.coerce.number().int().min(1).max(100).default(20),
});

// ─── Repository ───────────────────────────────────────────────────────────────

interface IAuditLogRow extends mysql.RowDataPacket {
  id: number;
  user_id: number | null;
  username: string | null;
  role: string | null;
  action_type: string;
  ip_address: string | null;
  user_agent: string | null;
  resource_affected: string | null;
  payload_snapshot: string | null;
  created_at: Date;
  total_count: number;
}

class AuditRepository extends BaseRepository {
  protected readonly moduleName = 'audit';

  async findLogs(
    filters: {
      userId?: number;
      actionType?: string;
      startDate?: string;
      endDate?: string;
      ip?: string;
    },
    limit: number,
    offset: number,
  ): Promise<IAuditLogRow[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];

    if (filters.userId !== undefined) {
      conditions.push('a.user_id = ?');
      values.push(filters.userId);
    }
    if (filters.actionType) {
      conditions.push('a.action_type = ?');
      values.push(filters.actionType);
    }
    if (filters.startDate) {
      conditions.push('a.created_at >= ?');
      values.push(filters.startDate);
    }
    if (filters.endDate) {
      conditions.push('a.created_at < DATE_ADD(?, INTERVAL 1 DAY)');
      values.push(filters.endDate);
    }
    if (filters.ip) {
      conditions.push('a.ip_address = ?');
      values.push(filters.ip);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    values.push(limit, offset);

    return this.query<IAuditLogRow>(
      `SELECT
         a.id,
         a.user_id,
         u.username,
         u.role,
         a.action_type,
         a.ip_address,
         a.user_agent,
         a.resource_affected,
         a.payload_snapshot,
         a.created_at,
         COUNT(*) OVER() AS total_count
       FROM audit_logs a
       LEFT JOIN users u ON u.id = a.user_id
       ${where}
       ORDER BY a.created_at DESC
       LIMIT ? OFFSET ?`,
      values,
    );
  }
}

// ─── Dependencies ─────────────────────────────────────────────────────────────

const repo   = new AuditRepository();
const router = Router();

// GET /api/v1/audit-logs — System Admin only
router.get(
  '/',
  authenticate,
  authorize(['System Admin']),
  validate(auditLogsQuerySchema, 'query'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = req.query as z.infer<typeof auditLogsQuerySchema>;
      const { page, limit, offset } = parsePagination(req);

      const rows = await repo.findLogs(
        {
          userId:     query.userId,
          actionType: query.actionType,
          startDate:  query.startDate,
          endDate:    query.endDate,
          ip:         query.ip,
        },
        limit,
        offset,
      );

      const totalCount = rows[0]?.total_count ?? 0;

      // Map to web's AuditLog shape
      const data = rows.map((r) => ({
        id:               r.id,
        user:             r.user_id !== null
          ? { id: r.user_id, username: r.username ?? '', role: r.role ?? '' }
          : null,
        actionType:       r.action_type,
        ipAddress:        r.ip_address ?? '',
        userAgent:        r.user_agent ?? '',
        resourceAffected: r.resource_affected ?? '',
        payloadSnapshot:  r.payload_snapshot ?? null,
        timestamp:        r.created_at instanceof Date
          ? r.created_at.toISOString()
          : String(r.created_at),
      }));

      sendSuccess(res, data, 'Audit logs retrieved', 200, buildPagination(page, limit, totalCount));
    } catch (err) { next(err); }
  },
);

export { router as auditLogsRouter };
