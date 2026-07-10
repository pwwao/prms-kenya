/**
 * Chat Validators
 *
 * Architecture Contract §6.1 — Zod parsing for all inputs.
 * Validates the REST endpoint:
 *   GET /api/v1/referrals/:referralId/messages
 */

import { z } from 'zod';
import { idParamSchema, paginationQuerySchema } from '../../shared/schemas/common.schemas.js';

/** Route params for /referrals/:referralId/messages */
export const referralMessagesParamsSchema = z.object({
  referralId: idParamSchema.shape.id,
});

/** Query params for chat history pagination */
export const chatHistoryQuerySchema = paginationQuerySchema;

export type TReferralMessagesParams = z.infer<typeof referralMessagesParamsSchema>;
export type TChatHistoryQuery = z.infer<typeof chatHistoryQuerySchema>;
