/**
 * Notifications Controller
 *
 * Architecture Contract §8.7:
 *   GET   /api/v1/notifications          — Any authenticated
 *   PATCH /api/v1/notifications/:id/read  — Any authenticated
 * §8.1 — Standard response envelope.
 */

import type { Request, Response, NextFunction } from 'express';
import { NotificationsService } from './notifications.service.js';
import { sendSuccess, sendNoContent } from '../../shared/response.helper.js';
import { parsePagination, buildPagination } from '../../shared/pagination.helper.js';
import { AuthError, NotFoundError } from '../../shared/errors/domain.errors.js';

const notificationsService = new NotificationsService();

/**
 * GET /api/v1/notifications
 * Returns the authenticated user's notification inbox, paginated.
 * Query param `unreadOnly=true` filters to unread notifications only.
 */
export async function listNotifications(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new AuthError('Authentication required');

    const { page, limit, offset } = parsePagination(req);
    const unreadOnly = (req.query as { unreadOnly?: boolean }).unreadOnly ?? false;

    const { notifications, total } = await notificationsService.listForUser(
      req.user.userId,
      limit,
      offset,
      unreadOnly,
    );

    sendSuccess(
      res,
      notifications,
      'Notifications retrieved successfully',
      200,
      buildPagination(page, limit, total),
    );
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/notifications/:id/read
 * Marks a single notification as read. Returns 404 if not found or not
 * owned by the requesting user (no existence leak across users).
 */
export async function markNotificationRead(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new AuthError('Authentication required');

    const id = Number((req.params as { id: string }).id);

    const updated = await notificationsService.markAsRead(id, req.user.userId);
    if (!updated) {
      throw new NotFoundError('Notification');
    }

    sendNoContent(res);
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/notifications/read-all
 * Marks all of the authenticated user's notifications as read.
 * Extension beyond §8.7 registry — convenience bulk action for mobile inbox.
 */
export async function markAllNotificationsRead(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new AuthError('Authentication required');

    const count = await notificationsService.markAllAsRead(req.user.userId);

    sendSuccess(res, { markedCount: count }, 'All notifications marked as read');
  } catch (err) {
    next(err);
  }
}
