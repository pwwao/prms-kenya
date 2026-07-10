/**
 * Referrals Validator — Zod schemas
 * Architecture Contract §6.1, §10.6
 */

import { z } from 'zod';
import {
  referralIdParamSchema,
  paginationQuerySchema,
  nonEmptyStringSchema,
} from '../../shared/schemas/common.schemas.js';

// ─── Shared field schemas ─────────────────────────────────────────────────────

const urgencyLevelSchema = z.enum(['Routine', 'Urgent', 'Emergent']);

const referralStatusSchema = z.enum([
  'Draft', 'Dispatched', 'Received', 'Accepted', 'Rejected', 'Completed',
]);

const hospitalRoleSchema = z.enum(['source', 'destination', 'any']).default('any');

// ─── Request schemas ──────────────────────────────────────────────────────────

export const createReferralSchema = z.object({
  patientId:             z.number().int().positive('Patient ID must be a positive integer'),
  destinationHospitalId: z.number().int().positive('Destination hospital ID must be a positive integer'),
  urgencyLevel:          urgencyLevelSchema,
  clinicalSummary:       z.string().trim().max(10_000).optional().nullable(),
  reasonForReferral:     nonEmptyStringSchema.max(2000),
});

export const updateReferralSchema = z.object({
  urgencyLevel:          urgencyLevelSchema.optional(),
  clinicalSummary:       z.string().trim().max(10_000).optional().nullable(),
  reasonForReferral:     nonEmptyStringSchema.max(2000).optional(),
  destinationHospitalId: z.number().int().positive().optional(),
}).refine((d) => Object.keys(d).length > 0, { message: 'At least one field must be provided' });

export const transitionStatusSchema = z.object({
  status: referralStatusSchema,
  rejectionReason: z.string().trim().min(10).max(1000).optional().nullable(),
  notes:           z.string().trim().max(2000).optional().nullable(),
}).refine(
  (d) => d.status !== 'Rejected' || (d.rejectionReason && d.rejectionReason.trim().length >= 10),
  {
    message: 'rejection_reason (min 10 chars) is required when transitioning to Rejected',
    path: ['rejectionReason'],
  },
);

export const listReferralsQuerySchema = paginationQuerySchema.extend({
  status:        referralStatusSchema.optional(),
  urgencyLevel:  urgencyLevelSchema.optional(),
  patientId:     z.coerce.number().int().positive().optional(),
  hospitalRole:  hospitalRoleSchema.optional(),
});

export const referralCodeParamSchema = z.object({
  code: z.string().trim().min(1, 'Referral code is required'),
});

// ─── Exports ──────────────────────────────────────────────────────────────────

export { referralIdParamSchema };

export type TCreateReferralInput    = z.infer<typeof createReferralSchema>;
export type TUpdateReferralInput    = z.infer<typeof updateReferralSchema>;
export type TTransitionStatusInput  = z.infer<typeof transitionStatusSchema>;
export type TListReferralsQuery     = z.infer<typeof listReferralsQuerySchema>;
