/**
 * Reports Routes
 * Architecture Contract §8.7 / OpenAPI v1.0 — Analytics endpoints.
 *
 * GET  /api/v1/reports/county
 * GET  /api/v1/reports/referral-trends
 * GET  /api/v1/reports/facility-performance
 * GET  /api/v1/reports/export-pdf          ← NEW: PDF export
 *
 * Uses stored procedures sp_get_county_report and sp_get_facility_performance
 * from PRMS_Database_Complete.sql where they exist; referral-trends uses a
 * direct query (no SP was defined for it).
 *
 * Response shapes match the web admin CountyReportRow, ReferralTrendRow, and
 * FacilityPerformanceRow types in src/types/report.types.ts exactly.
 */

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate.middleware.js';
import { authorize, requirePermission } from '../../middleware/authorize.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { sendSuccess } from '../../shared/response.helper.js';
import { reportRateLimiter } from '../../middleware/rate-limit.middleware.js';
import { BaseRepository } from '../../shared/base.repository.js';
import type mysql from 'mysql2/promise';

// ─── Validation ───────────────────────────────────────────────────────────────

// Base object kept extendable (no .refine() here — ZodEffects has no .extend()).
const dateRangeShape = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'startDate must be YYYY-MM-DD'),
  endDate:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'endDate must be YYYY-MM-DD'),
});

// Shared cross-field check, applied to each extended schema individually.
const withDateRangeCheck = <T extends z.ZodTypeAny>(schema: T) =>
  schema.refine(
    (d: any) => d.startDate <= d.endDate,
    { message: 'startDate must not be after endDate', path: ['startDate'] }
  );

const countyReportQuerySchema = withDateRangeCheck(
  dateRangeShape.extend({
    county: z.string().trim().optional(),
  })
);

const trendsQuerySchema = withDateRangeCheck(
  dateRangeShape.extend({
    groupBy: z.enum(['day', 'week']).default('day'),
  })
);

const facilityQuerySchema = withDateRangeCheck(
  dateRangeShape.extend({
    hospitalId: z.coerce.number().int().positive().optional(),
  })
);

// PDF export query schema — supports all three report types
const pdfExportQuerySchema = withDateRangeCheck(
  dateRangeShape.extend({
    reportType: z.enum(['county', 'referral-trends', 'facility-performance']).default('county'),
    groupBy:    z.enum(['day', 'week']).default('day'),
    hospitalId: z.coerce.number().int().positive().optional(),
    county:     z.string().trim().optional(),
  })
);

// ─── Thin repository for report queries ──────────────────────────────────────

class ReportsRepository extends BaseRepository {
  protected readonly moduleName = 'reports';

  async getCountyReport(
    fromDate: string,
    toDate: string,
  ): Promise<mysql.RowDataPacket[]> {
    return this.query<mysql.RowDataPacket>(
      `CALL sp_get_county_report(?, ?)`,
      [fromDate, toDate],
    );
  }

  async getReferralTrends(
    fromDate: string,
    toDate: string,
    groupBy: 'day' | 'week',
  ): Promise<mysql.RowDataPacket[]> {
    const dateTrunc =
      groupBy === 'week'
        ? `DATE_FORMAT(DATE_SUB(r.created_at, INTERVAL WEEKDAY(r.created_at) DAY), '%Y-%m-%d')`
        : `DATE_FORMAT(r.created_at, '%Y-%m-%d')`;

    return this.query<mysql.RowDataPacket>(
      `SELECT
         ${dateTrunc}                                                      AS period,
         COUNT(*)                                                           AS total,
         SUM(CASE WHEN r.urgency_level = 'Urgent'   THEN 1 ELSE 0 END)   AS urgent,
         SUM(CASE WHEN r.urgency_level = 'Emergent' THEN 1 ELSE 0 END)   AS emergent,
         SUM(CASE WHEN r.urgency_level = 'Routine'  THEN 1 ELSE 0 END)   AS routine
       FROM referrals r
       WHERE r.created_at BETWEEN ? AND DATE_ADD(?, INTERVAL 1 DAY)
       GROUP BY period
       ORDER BY period ASC`,
      [fromDate, toDate],
    );
  }

  async getFacilityPerformance(
    fromDate: string,
    toDate: string,
    hospitalId: number | null,
  ): Promise<mysql.RowDataPacket[]> {
    return this.query<mysql.RowDataPacket>(
      `CALL sp_get_facility_performance(?, ?, ?)`,
      [hospitalId, fromDate, toDate],
    );
  }
}

// ─── Dependencies ─────────────────────────────────────────────────────────────

const repo = new ReportsRepository();

// ─── Helpers — map DB snake_case to web camelCase ────────────────────────────

function mapCountyRow(row: mysql.RowDataPacket, filter?: string) {
  return {
    county:                   row.county as string,
    totalReferrals:           Number(row.total_referrals ?? 0),
    // SP doesn't return 'Accepted' count — derive from completed + in-flight
    accepted:                 Number(row.completed ?? 0),
    rejected:                 Number(row.rejected  ?? 0),
    completed:                Number(row.completed ?? 0),
    // 'pending' = total - completed - rejected
    pending:
      Number(row.total_referrals ?? 0) -
      Number(row.completed ?? 0) -
      Number(row.rejected  ?? 0),
    // SP returns minutes; web type expects hours
    averageResponseTimeHours:
      row.avg_completion_minutes != null
        ? Math.round((Number(row.avg_completion_minutes) / 60) * 10) / 10
        : 0,
  };
}

function mapTrendRow(row: mysql.RowDataPacket) {
  return {
    period:   row.period as string,
    total:    Number(row.total    ?? 0),
    urgent:   Number(row.urgent   ?? 0),
    emergent: Number(row.emergent ?? 0),
    routine:  Number(row.routine  ?? 0),
  };
}

function mapFacilityRow(row: mysql.RowDataPacket) {
  const sent     = Number(row.outgoing_referrals ?? 0);
  const received = Number(row.incoming_referrals ?? 0);
  const rejected = Number(row.rejections_incoming ?? 0);
  const completed = Number(row.completed_outgoing ?? 0);

  return {
    hospitalId:              Number(row.hospital_id),
    hospitalName:            row.hospital_name as string,
    facilityLevel:           row.facility_level as string,
    county:                  row.county as string,
    referralsSent:           sent,
    referralsReceived:       received,
    acceptanceRate:          received > 0 ? Math.round(((received - rejected) / received) * 1000) / 10 : 0,
    rejectionRate:           received > 0 ? Math.round((rejected / received) * 1000) / 10 : 0,
    averageResponseTimeHours:
      row.avg_accept_time_minutes != null
        ? Math.round((Number(row.avg_accept_time_minutes) / 60) * 10) / 10
        : 0,
    completionRate:          sent > 0 ? Math.round((completed / sent) * 1000) / 10 : 0,
  };
}

// ─── PDF generation helper (zero external dependencies) ──────────────────────
// Generates a minimal but well-structured PDF using raw PDF syntax.
// This avoids adding pdfkit/puppeteer to the dependency tree.

type TableRow = Record<string, string | number>;

function buildPdfBuffer(
  title: string,
  subtitle: string,
  headers: string[],
  keys: string[],
  rows: TableRow[],
): Buffer {
  // PDF coordinate system: origin bottom-left, units = points (1pt = 1/72 inch)
  const PAGE_W = 595.28;   // A4 width
  const PAGE_H = 841.89;   // A4 height
  const MARGIN  = 40;
  const COL_W   = Math.floor((PAGE_W - MARGIN * 2) / headers.length);
  const ROW_H   = 18;
  const HEADER_H = 24;

  const lines: string[] = [];

  // ── PDF header ──
  lines.push('%PDF-1.4');

  // ── Object 1: Catalog ──
  const objects: string[] = [];
  objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj');

  // ── Object 3: Font (Helvetica, no embedding needed) ──
  objects.push('3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj');
  objects.push('4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj');

  // ── Build page content stream ──
  const contentLines: string[] = [];
  contentLines.push('BT');
  contentLines.push('/F2 16 Tf');  // Bold title
  contentLines.push(`${MARGIN} ${PAGE_H - 50} Td`);
  contentLines.push(`(${title.replace(/[()\\]/g, '\\$&')}) Tj`);
  contentLines.push('ET');

  contentLines.push('BT');
  contentLines.push('/F1 9 Tf');
  contentLines.push(`${MARGIN} ${PAGE_H - 68} Td`);
  contentLines.push(`(${subtitle.replace(/[()\\]/g, '\\$&')}) Tj`);
  contentLines.push('ET');

  // Horizontal rule under subtitle
  contentLines.push(`${MARGIN} ${PAGE_H - 75} m ${PAGE_W - MARGIN} ${PAGE_H - 75} l S`);

  // ── Column headers ──
  let y = PAGE_H - 75 - HEADER_H;
  // Header background (light grey)
  contentLines.push('0.85 0.85 0.85 rg');
  contentLines.push(`${MARGIN} ${y} ${PAGE_W - MARGIN * 2} ${HEADER_H} re f`);
  contentLines.push('0 0 0 rg');

  contentLines.push('BT');
  contentLines.push('/F2 8 Tf');
  headers.forEach((h, i) => {
    const x = MARGIN + i * COL_W + 3;
    contentLines.push(`${x} ${y + 6} Td`);
    contentLines.push(`(${h.replace(/[()\\]/g, '\\$&')}) Tj`);
    if (i < headers.length - 1) {
      contentLines.push(`${-(x)} ${-(y + 6)} Td`);
    }
  });
  contentLines.push('ET');

  y -= ROW_H;

  // ── Data rows ──
  rows.forEach((row, ri) => {
    if (y < MARGIN + ROW_H) return; // simple overflow guard (no multi-page for now)

    // Alternating row background
    if (ri % 2 === 0) {
      contentLines.push('0.96 0.96 0.96 rg');
      contentLines.push(`${MARGIN} ${y} ${PAGE_W - MARGIN * 2} ${ROW_H} re f`);
      contentLines.push('0 0 0 rg');
    }

    contentLines.push('BT');
    contentLines.push('/F1 7.5 Tf');
    keys.forEach((k, i) => {
      const val = String(row[k] ?? '');
      const x = MARGIN + i * COL_W + 3;
      contentLines.push(`${x} ${y + 5} Td`);
      contentLines.push(`(${val.slice(0, 20).replace(/[()\\]/g, '\\$&')}) Tj`);
      if (i < keys.length - 1) {
        contentLines.push(`${-(x)} ${-(y + 5)} Td`);
      }
    });
    contentLines.push('ET');

    // Row border
    contentLines.push(`0.8 0.8 0.8 RG`);
    contentLines.push(`${MARGIN} ${y} m ${PAGE_W - MARGIN} ${y} l S`);
    contentLines.push(`0 0 0 RG`);

    y -= ROW_H;
  });

  // Footer
  contentLines.push('BT');
  contentLines.push('/F1 8 Tf');
  contentLines.push(`${MARGIN} ${MARGIN} Td`);
  contentLines.push(`(Generated by PRMS Kenya \u2014 ${new Date().toISOString().slice(0, 10)}) Tj`);
  contentLines.push('ET');

  const streamContent = contentLines.join('\n');

  // ── Object 5: Content stream ──
  const streamBytes = Buffer.from(streamContent, 'latin1');
  objects.push(
    `5 0 obj\n<< /Length ${streamBytes.length} >>\nstream\n${streamContent}\nendstream\nendobj`,
  );

  // ── Object 6: Page ──
  objects.push(
    `6 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}]\n` +
    `   /Contents 5 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> >>\nendobj`,
  );

  // ── Object 2: Pages ──
  objects.push('2 0 obj\n<< /Type /Pages /Kids [6 0 R] /Count 1 >>\nendobj');

  // ── Assemble PDF ──
  const bodyLines: string[] = ['%PDF-1.4'];
  const offsets: number[] = [];
  let offset = bodyLines.join('\n').length + 1;

  // Re-order objects by index for correct xref
  const orderedObjs = [
    objects[0], // 1 catalog
    objects[6], // 2 pages
    objects[1], // 3 font
    objects[2], // 4 font bold
    objects[3], // 5 stream
    objects[4], // 6 page
  ];

  orderedObjs.forEach((obj) => {
    offsets.push(offset);
    bodyLines.push(obj);
    offset += obj.length + 1;
  });

  const xrefOffset = offset;
  bodyLines.push('xref');
  bodyLines.push(`0 ${orderedObjs.length + 1}`);
  bodyLines.push('0000000000 65535 f ');
  offsets.forEach((o) => bodyLines.push(String(o).padStart(10, '0') + ' 00000 n '));
  bodyLines.push('trailer');
  bodyLines.push(`<< /Size ${orderedObjs.length + 1} /Root 1 0 R >>`);
  bodyLines.push('startxref');
  bodyLines.push(String(xrefOffset));
  bodyLines.push('%%EOF');

  return Buffer.from(bodyLines.join('\n'), 'latin1');
}

// ─── Router ───────────────────────────────────────────────────────────────────

const router = Router();

// All report endpoints require authentication + report:view permission.
// Rate limited to 10 req/min per the pre-built reportRateLimiter.
router.use(authenticate, requirePermission('report:view'), reportRateLimiter);

// GET /api/v1/reports/county
router.get(
  '/county',
  validate(countyReportQuerySchema, 'query'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { startDate, endDate, county } = req.query as z.infer<typeof countyReportQuerySchema>;
      const rows = await repo.getCountyReport(startDate, endDate);

      // Stored procedures return results in the first element of a CALL result
      const data = (Array.isArray(rows[0]) ? rows[0] : rows) as mysql.RowDataPacket[];
      let result = data.map(mapCountyRow);

      if (county) {
        result = result.filter((r) => r.county.toLowerCase() === county.toLowerCase());
      }

      sendSuccess(res, result, 'County report retrieved');
    } catch (err) { next(err); }
  },
);

// GET /api/v1/reports/referral-trends
router.get(
  '/referral-trends',
  validate(trendsQuerySchema, 'query'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { startDate, endDate, groupBy } = req.query as z.infer<typeof trendsQuerySchema>;
      const rows = await repo.getReferralTrends(startDate, endDate, groupBy);
      sendSuccess(res, rows.map(mapTrendRow), 'Referral trends retrieved');
    } catch (err) { next(err); }
  },
);

// GET /api/v1/reports/facility-performance
router.get(
  '/facility-performance',
  authorize(['System Admin', 'Hospital Admin']),
  validate(facilityQuerySchema, 'query'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user!;
      const { startDate, endDate, hospitalId } = req.query as z.infer<typeof facilityQuerySchema>;

      // Hospital Admin can only see their own facility's data
      const effectiveHospitalId =
        user.role === 'Hospital Admin' ? user.hospitalId : (hospitalId ?? null);

      const rows = await repo.getFacilityPerformance(startDate, endDate, effectiveHospitalId);
      const data = (Array.isArray(rows[0]) ? rows[0] : rows) as mysql.RowDataPacket[];

      sendSuccess(res, data.map(mapFacilityRow), 'Facility performance report retrieved');
    } catch (err) { next(err); }
  },
);

// GET /api/v1/reports/export-pdf
// ─────────────────────────────────────────────────────────────────────────────
// BUG FIX: This endpoint was missing entirely. Generates a PDF for any of the
// three report types and streams it as an attachment download.
// No external PDF library required — uses raw PDF syntax via Buffer.
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  '/export-pdf',
  validate(pdfExportQuerySchema, 'query'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user!;
      const {
        startDate,
        endDate,
        reportType,
        groupBy,
        hospitalId,
        county,
      } = req.query as z.infer<typeof pdfExportQuerySchema>;

      const dateRange = `${startDate} to ${endDate}`;
      let pdfBuffer: Buffer;

      if (reportType === 'county') {
        const rows = await repo.getCountyReport(startDate, endDate);
        const data = (Array.isArray(rows[0]) ? rows[0] : rows) as mysql.RowDataPacket[];
        let result = data.map(mapCountyRow);
        if (county) {
          result = result.filter((r) => r.county.toLowerCase() === county.toLowerCase());
        }
        pdfBuffer = buildPdfBuffer(
          'County Referral Report',
          `Period: ${dateRange}  |  Generated by PRMS Kenya`,
          ['County', 'Total', 'Completed', 'Rejected', 'Pending', 'Avg Hrs'],
          ['county', 'totalReferrals', 'completed', 'rejected', 'pending', 'averageResponseTimeHours'],
          result as TableRow[],
        );

      } else if (reportType === 'referral-trends') {
        const rows = await repo.getReferralTrends(startDate, endDate, groupBy);
        const result = rows.map(mapTrendRow);
        pdfBuffer = buildPdfBuffer(
          'Referral Trends Report',
          `Period: ${dateRange}  |  Grouped by: ${groupBy}  |  Generated by PRMS Kenya`,
          ['Period', 'Total', 'Routine', 'Urgent', 'Emergent'],
          ['period', 'total', 'routine', 'urgent', 'emergent'],
          result as TableRow[],
        );

      } else {
        // facility-performance — Hospital Admin scoped to own facility
        if (user.role !== 'System Admin' && user.role !== 'Hospital Admin') {
          res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
          return;
        }
        const effectiveHospitalId =
          user.role === 'Hospital Admin' ? user.hospitalId : (hospitalId ?? null);
        const rows = await repo.getFacilityPerformance(startDate, endDate, effectiveHospitalId);
        const data = (Array.isArray(rows[0]) ? rows[0] : rows) as mysql.RowDataPacket[];
        const result = data.map(mapFacilityRow);
        pdfBuffer = buildPdfBuffer(
          'Facility Performance Report',
          `Period: ${dateRange}  |  Generated by PRMS Kenya`,
          ['Hospital', 'Level', 'County', 'Sent', 'Received', 'Accept%', 'Complete%'],
          ['hospitalName', 'facilityLevel', 'county', 'referralsSent', 'referralsReceived', 'acceptanceRate', 'completionRate'],
          result as TableRow[],
        );
      }

      const filename = `prms-${reportType}-${startDate}-${endDate}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.end(pdfBuffer);
    } catch (err) { next(err); }
  },
);

export { router as reportsRouter };
