/**
 * Users Validator — Zod schemas
 * Architecture Contract §6.1, §10.6
 */

import { z } from 'zod';
import {
  userIdParamSchema,
  paginationQuerySchema,
  emailSchema,
  passwordSchema,
  phoneSchema,
  shortTextSchema,
  userRoleSchema,
} from '../../shared/schemas/common.schemas.js';

export const createUserSchema = z.object({
  hospitalId: z.number().int().positive().nullable().default(null),
  username: z
    .string()
    .trim()
    .min(3, 'Username must be at least 3 characters')
    .max(50)
    .regex(/^[a-zA-Z0-9_.-]+$/, 'Username may only contain letters, digits, underscores, dots, hyphens'),
  email: emailSchema.optional().nullable(),
  password: passwordSchema,
  role: userRoleSchema,
  fullName: shortTextSchema,
  phoneNumber: phoneSchema.optional().nullable(),
});

export const updateUserSchema = z.object({
  email: emailSchema.optional().nullable(),
  fullName: shortTextSchema.optional(),
  phoneNumber: phoneSchema.optional().nullable(),
}).refine((d) => Object.keys(d).length > 0, { message: 'At least one field must be provided' });

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
}).refine((d) => d.currentPassword !== d.newPassword, {
  message: 'New password must differ from current password',
  path: ['newPassword'],
});

export const listUsersQuerySchema = paginationQuerySchema.extend({
  hospitalId: z.coerce.number().int().positive().optional(),
  role: userRoleSchema.optional(),
  status: z.enum(['Active', 'Inactive', 'Suspended']).optional(),
});

// PATCH /users/:userId/status — matches web UpdateStaffStatusRequest
export const updateUserStatusSchema = z.object({
  status: z.enum(['Active', 'Suspended']),
  reason: z.string().trim().max(500).optional(),
});

export { userIdParamSchema };

export type TCreateUserInput        = z.infer<typeof createUserSchema>;
export type TUpdateUserInput        = z.infer<typeof updateUserSchema>;
export type TChangePasswordInput    = z.infer<typeof changePasswordSchema>;
export type TListUsersQuery         = z.infer<typeof listUsersQuerySchema>;
export type TUpdateUserStatusInput  = z.infer<typeof updateUserStatusSchema>;
