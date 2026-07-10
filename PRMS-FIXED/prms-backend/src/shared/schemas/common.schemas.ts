/**
 * Common Zod Schemas
 *
 * Shared primitive schemas reused across all business module validators.
 * Architecture Contract §6.1 — "Zod parsing not type assertions"
 * §10.6 — "Zod validation on all inputs"
 *
 * Import these instead of re-defining common patterns per module.
 */

import { z } from 'zod';

// ─── ID schemas ───────────────────────────────────────────────────────────────

/** Auto-increment primary key — must be positive integer */
export const idSchema = z.coerce.number().int().positive();

/** Route param containing a numeric ID: /resources/:id */
export const idParamSchema = z.object({ id: idSchema });

/** Route param containing a hospitalId: /hospitals/:hospitalId/... */
export const hospitalIdParamSchema = z.object({ hospitalId: idSchema });

/** Route param containing a referralId: /referrals/:referralId/... */
export const referralIdParamSchema = z.object({ referralId: idSchema });

/** Route param containing a patientId: /patients/:patientId/... */
export const patientIdParamSchema = z.object({ patientId: idSchema });

/** Route param containing a userId: /users/:userId/... */
export const userIdParamSchema = z.object({ userId: idSchema });

// ─── Pagination ───────────────────────────────────────────────────────────────

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ─── Kenya-specific primitives ────────────────────────────────────────────────

/**
 * Kenya national ID — 7 or 8 digits.
 * Architecture Contract §11.1 — used as a unique patient identifier.
 */
export const nationalIdSchema = z
  .string()
  .trim()
  .regex(/^\d{7,8}$/, 'National ID must be 7 or 8 digits');

/**
 * Kenya phone number — E.164 format starting with +254 or 07/01.
 * Normalised to +254XXXXXXXXX downstream.
 */
export const phoneSchema = z
  .string()
  .trim()
  .regex(
    /^(?:\+254|0)[17]\d{8}$/,
    'Phone number must be a valid Kenya number (e.g. +254722000000 or 0722000000)',
  );

/**
 * Kenya Medical Licence number — validates format KE/YYYY/NNNNN.
 */
export const medicalLicenceSchema = z
  .string()
  .trim()
  .regex(/^KE\/\d{4}\/\d{5}$/, 'Medical licence must be in format KE/YYYY/NNNNN');

// ─── General primitives ───────────────────────────────────────────────────────

export const emailSchema = z.string().trim().email().toLowerCase();

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
    'Password must contain uppercase, lowercase, number, and special character',
  );

export const uuidSchema = z
  .string()
  .uuid('Must be a valid UUID v4');

/** ISO 8601 date string — parsed to Date object */
export const isoDateSchema = z.string().datetime({ offset: true });

/** Non-empty trimmed string */
export const nonEmptyStringSchema = z.string().trim().min(1, 'This field is required');

/** Short text field — names, titles */
export const shortTextSchema = z.string().trim().min(1).max(255);

/** Long text field — notes, descriptions */
export const longTextSchema = z.string().trim().min(1).max(5000);

// ─── Referral-specific ────────────────────────────────────────────────────────

export const referralStatusSchema = z.enum([
  'Draft',
  'Dispatched',
  'Received',
  'Accepted',
  'Rejected',
  'Completed',
]);

export const urgencyLevelSchema = z.enum([
  'Routine',
  'Urgent',
  'Emergent',
]);

/**
 * NOTE: There is no `referral_type` column on the `referrals` table in
 * PRMS_Database_Complete.sql, and no validator currently imports this schema.
 * Left in place in case a future migration adds this column, but do not
 * assume it is wired up — verify against the schema before using it.
 */
export const referralTypeSchema = z.enum([
  'Outpatient',
  'Inpatient',
  'Emergency',
  'Specialist Consultation',
  'Diagnostic',
  'Follow-up',
]);

// ─── User / Auth ──────────────────────────────────────────────────────────────

export const userRoleSchema = z.enum([
  'System Admin',
  'Hospital Admin',
  'Clinician',
  'Receptionist',
]);

export const otpSchema = z
  .string()
  .trim()
  .length(6, 'OTP must be exactly 6 digits')
  .regex(/^\d{6}$/, 'OTP must contain only digits');

// ─── Hospital ─────────────────────────────────────────────────────────────────

/**
 * NOTE: The `hospitals` table has a `facility_level` column (Level 2–6),
 * which is a different concept from "type" below. No validator currently
 * imports this schema and no `hospital_type` column exists. Left in place
 * in case this is a deliberately separate future field — verify against
 * the schema before using it.
 */
export const hospitalTypeSchema = z.enum([
  'National Referral Hospital',
  'County Referral Hospital',
  'Sub-county Hospital',
  'Health Centre',
  'Dispensary',
  'Private Hospital',
  'Mission Hospital',
]);

export const hospitalStatusSchema = z.enum([
  'Pending',
  'Approved',
  'Suspended',
]);
