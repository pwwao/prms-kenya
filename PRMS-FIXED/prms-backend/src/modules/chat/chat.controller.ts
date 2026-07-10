/**
 * Chat Controller
 *
 * Architecture Contract §8.7 — `GET /api/v1/referrals/:referralId/messages`
 * (Clinician role). Returns decrypted, paginated chat history for a referral.
 * §8.1 — All responses use the standard envelope via response.helper.
 */

import type { Request, Response, NextFunction } from 'express';
import { ChatService } from './chat.service.js';
import { sendSuccess } from '../../shared/response.helper.js';
import { parsePagination, buildPagination } from '../../shared/pagination.helper.js';
import { AuthError } from '../../shared/errors/domain.errors.js';

const chatService = new ChatService();

/**
 * GET /api/v1/referrals/:referralId/messages
 * Returns paginated, decrypted chat history for a referral.
 * Enforces facility isolation via ChatService.assertAccess.
 */
export async function getReferralMessages(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new AuthError('Authentication required');

    const referralId = Number((req.params as { referralId: string }).referralId);
    const { page, limit, offset } = parsePagination(req);

    const { messages, total } = await chatService.getHistory(
      referralId,
      req.user.hospitalId,
      limit,
      offset,
    );

    sendSuccess(
      res,
      messages,
      'Chat history retrieved successfully',
      200,
      buildPagination(page, limit, total),
    );
  } catch (err) {
    next(err);
  }
}
