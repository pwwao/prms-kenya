/**
 * Chat Routes
 *
 * Architecture Contract §8.7 — `/api/v1/referrals/:referralId/messages`.
 * Registered under `/api/v1/referrals` by server.ts:
 *   app.use('/api/v1/referrals', referralsRouter);
 *   app.use('/api/v1/referrals', chatRouter); // mounted alongside
 *
 * Real-time chat is handled by chat.gateway.ts (Socket.IO `/chat` namespace);
 * this router exposes only the read-history REST endpoint.
 */

import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.middleware.js';
import { requirePermission } from '../../middleware/authorize.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import {
  referralMessagesParamsSchema,
  chatHistoryQuerySchema,
} from './chat.validator.js';
import { getReferralMessages } from './chat.controller.js';

export const chatRouter = Router();

// GET /api/v1/referrals/:referralId/messages — Clinician (chat:access)
chatRouter.get(
  '/:referralId/messages',
  authenticate,
  requirePermission('chat:access'),
  validate(referralMessagesParamsSchema, 'params'),
  validate(chatHistoryQuerySchema, 'query'),
  getReferralMessages,
);
