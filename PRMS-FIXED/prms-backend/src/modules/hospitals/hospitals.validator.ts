/**
 * Hospitals Validator — Zod schemas for all hospital routes.
 * Architecture Contract §6.1, §10.6 — Zod parsing on all inputs.
 */

import { z } from 'zod';
import {
  hospitalIdParamSchema,
  paginationQuerySchema,
  emailSchema,
  phoneSchema,
  nonEmptyStringSchema,
  shortTextSchema,
} from '../../shared/schemas/common.schemas.js';

// ─── Field schemas ────────────────────────────────────────────────────────────

const mohCodeSchema = z
  .string()
  .trim()
  .min(2, 'MOH code must be at least 2 characters')
  .max(20, 'MOH code must be at most 20 characters')
  .regex(/^[A-Z0-9\-]+$/i, 'MOH code may only contain letters, digits, and hyphens');

const facilityLevelSchema = z.enum(['Level 2', 'Level 3', 'Level 4', 'Level 5', 'Level 6']);

const hospitalStatusSchema = z.enum(['Pending', 'Approved', 'Suspended']);

const countySchema = z.string().trim().min(2).max(100);

// ─── Request schemas ──────────────────────────────────────────────────────────

export const createHospitalSchema = z.object({
  mohCode: mohCodeSchema,
  name: shortTextSchema,
  facilityLevel: facilityLevelSchema,
  county: countySchema,
  subCounty: countySchema,
  address: z.string().trim().max(500).optional().nullable(),
  phone: phoneSchema.optional().nullable(),
  email: emailSchema.optional().nullable(),
});

export const updateHospitalSchema = z.object({
  name: shortTextSchema.optional(),
  facilityLevel: facilityLevelSchema.optional(),
  county: countySchema.optional(),
  subCounty: countySchema.optional(),
  address: z.string().trim().max(500).optional().nullable(),
  phone: phoneSchema.optional().nullable(),
  email: emailSchema.optional().nullable(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});

export const approveHospitalSchema = z.object({
  reason: z.string().trim().max(1000).optional(),
});

export const suspendHospitalSchema = z.object({
  reason: z.string().trim().min(10, 'Suspension reason must be at least 10 characters').max(1000),
});

export const reactivateHospitalSchema = z.object({
  reason: z.string().trim().max(1000).optional(),
});

export const listHospitalsQuerySchema = paginationQuerySchema.extend({
  status: hospitalStatusSchema.optional(),
  county: countySchema.optional(),
  facilityLevel: facilityLevelSchema.optional(),
  q: z.string().trim().max(100).optional(),
});

// ─── Param schemas ────────────────────────────────────────────────────────────

export { hospitalIdParamSchema };
export type TCreateHospitalInput        = z.infer<typeof createHospitalSchema>;
export type TUpdateHospitalInput        = z.infer<typeof updateHospitalSchema>;
export type TListHospitalsQuery         = z.infer<typeof listHospitalsQuerySchema>;

// PATCH /hospitals/:hospitalId/status — matches web UpdateHospitalStatusRequest
// Note: Database ENUM is 'Pending'|'Approved'|'Suspended' (no 'Rejected').
// Web type includes 'Rejected' — kept here for future flexibility but will
// fail at DB insert if 'Rejected' is sent until the schema is extended.
export const updateHospitalStatusSchema = z.object({
  status: hospitalStatusSchema,
  reason: z.string().trim().max(1000).optional(),
});
export type TUpdateHospitalStatusInput  = z.infer<typeof updateHospitalStatusSchema>;
