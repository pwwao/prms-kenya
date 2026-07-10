/**
 * Notifications Routes
 *
 * Architecture Contract §8.7:
 *   GET   /api/v1/notifications           — Any authenticated
 *   PATCH /api/v1/notifications/:id/read  — Any authenticated
 *
 * Registered in server.ts:
 *   app.use('/api/v1/notifications', notificationsRouter);
 */

import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import {
  notificationIdParamSchema,
  listNotificationsQuerySchema,
} from './notifications.validator.js';
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from './notifications.controller.js';

export const notificationsRouter = Router();

// GET /api/v1/notifications — any authenticated user, own inbox only
notificationsRouter.get(
  '/',
  authenticate,
  validate(listNotificationsQuerySchema, 'query'),
  listNotifications,
);

// PATCH /api/v1/notifications/read-all — bulk mark-as-read
notificationsRouter.patch('/read-all', authenticate, markAllNotificationsRead);

// PATCH /api/v1/notifications/:id/read — Architecture Contract §8.7
notificationsRouter.patch(
  '/:id/read',
  authenticate,
  validate(notificationIdParamSchema, 'params'),
  markNotificationRead,
);
