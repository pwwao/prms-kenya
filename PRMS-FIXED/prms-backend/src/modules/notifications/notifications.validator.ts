/**
 * Notifications Validators
 *
 * Architecture Contract §6.1 — Zod parsing for all inputs.
 * Validates the REST endpoints:
 *   GET   /api/v1/notifications
 *   PATCH /api/v1/notifications/:id/read
 */

import { z } from 'zod';
import { idParamSchema, paginationQuerySchema } from '../../shared/schemas/common.schemas.js';

export const notificationIdParamSchema = idParamSchema;

export const listNotificationsQuerySchema = paginationQuerySchema.extend({
  unreadOnly: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((v) => v === 'true'),
});

export type TNotificationIdParam = z.infer<typeof notificationIdParamSchema>;
export type TListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;
