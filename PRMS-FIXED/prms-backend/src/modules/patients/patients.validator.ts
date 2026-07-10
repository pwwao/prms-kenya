/**
 * Patients Validator — Zod schemas
 */

import { z } from 'zod';
import {
  patientIdParamSchema,
  paginationQuerySchema,
  nationalIdSchema,
  phoneSchema,
  shortTextSchema,
} from '../../shared/schemas/common.schemas.js';

const genderSchema = z.enum(['Male', 'Female', 'Other', 'Prefer not to say']);

const dateOfBirthSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be YYYY-MM-DD')
  .refine((d) => {
    const date = new Date(d);
    const now  = new Date();
    return date < now && date > new Date('1900-01-01');
  }, 'Date of birth must be a valid past date');

export const createPatientSchema = z.object({
  nationalId:    nationalIdSchema.optional().nullable(),
  fullName:      shortTextSchema,
  phone:         phoneSchema.optional().nullable(),
  gender:        genderSchema,
  dateOfBirth:   dateOfBirthSchema,
  county:        z.string().trim().min(2).max(100),
  subCounty:     z.string().trim().min(2).max(100).optional().nullable(),
  nextOfKinName: z.string().trim().max(255).optional().nullable(),
  nextOfKinPhone: phoneSchema.optional().nullable(),
});

export const updatePatientSchema = z.object({
  fullName:      shortTextSchema.optional(),
  phone:         phoneSchema.optional().nullable(),
  gender:        genderSchema.optional(),
  dateOfBirth:   dateOfBirthSchema.optional(),
  county:        z.string().trim().min(2).max(100).optional(),
  subCounty:     z.string().trim().min(2).max(100).optional().nullable(),
  nextOfKinName: z.string().trim().max(255).optional().nullable(),
  nextOfKinPhone: phoneSchema.optional().nullable(),
}).refine((d) => Object.keys(d).length > 0, { message: 'At least one field must be provided' });

export const listPatientsQuerySchema = paginationQuerySchema.extend({
  county: z.string().trim().optional(),
  gender: genderSchema.optional(),
  q: z.string().trim().max(100).optional(),
});

export const searchQuerySchema = z.object({
  nationalId: nationalIdSchema.optional(),
  phone:      phoneSchema.optional(),
  q:          z.string().trim().max(100).optional(),
}).refine((d) => Boolean(d.nationalId || d.phone || (d.q && d.q.trim().length > 0)), {
  message: 'Provide a patient name, national ID, or phone number for search',
});

export { patientIdParamSchema };
export type TCreatePatientInput = z.infer<typeof createPatientSchema>;
export type TUpdatePatientInput = z.infer<typeof updatePatientSchema>;
export type TListPatientsQuery  = z.infer<typeof listPatientsQuerySchema>;
