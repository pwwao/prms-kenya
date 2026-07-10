/**
 * Users Router
 * Architecture Contract §10.3 — permission matrix enforcement.
 */

import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.middleware.js';
import { authorize } from '../../middleware/authorize.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { auditLog } from '../../middleware/audit.middleware.js';
import { UserController } from './users.controller.js';
import { UserService } from './users.service.js';
import { UserRepository } from './users.repository.js';
import { HospitalRepository } from '../hospitals/hospitals.repository.js';
import { CacheService } from '../../shared/services/cache.service.js';
import {
  createUserSchema,
  updateUserSchema,
  changePasswordSchema,
  listUsersQuerySchema,
  userIdParamSchema,
  updateUserStatusSchema,
} from './users.validator.js';

const repo           = new UserRepository();
const hospitalRepo   = new HospitalRepository();
const cache          = new CacheService();
const service        = new UserService(repo, hospitalRepo, cache);
const controller     = new UserController(service);

const router = Router();

// POST /api/v1/users
router.post(
  '/',
  authenticate,
  authorize(['System Admin', 'Hospital Admin']),
  validate(createUserSchema),
  auditLog({ actionType: 'CREATE_USER', resourceType: 'user' }),
  controller.create,
);

// GET /api/v1/users
router.get(
  '/',
  authenticate,
  authorize(['System Admin', 'Hospital Admin']),
  validate(listUsersQuerySchema, 'query'),
  controller.list,
);

// GET /api/v1/users/:userId
router.get(
  '/:userId',
  authenticate,
  validate(userIdParamSchema, 'params'),
  controller.getById,
);

// PATCH /api/v1/users/:userId
router.patch(
  '/:userId',
  authenticate,
  validate(userIdParamSchema, 'params'),
  validate(updateUserSchema),
  auditLog({ actionType: 'UPDATE_USER', resourceType: 'user' }),
  controller.update,
);

// PATCH /api/v1/users/:userId/password
router.patch(
  '/:userId/password',
  authenticate,
  validate(userIdParamSchema, 'params'),
  validate(changePasswordSchema),
  auditLog({ actionType: 'CHANGE_PASSWORD', resourceType: 'user' }),
  controller.changePassword,
);

// PATCH /api/v1/users/:userId/status  — OpenAPI v1.0 / web UpdateStaffStatusRequest
// Unified status endpoint: accepts {status: 'Active'|'Suspended', reason?}
// Supersedes the split POST /suspend + POST /reactivate routes below,
// which are kept for backward compatibility but may be removed in a later version.
router.patch(
  '/:userId/status',
  authenticate,
  authorize(['System Admin', 'Hospital Admin']),
  validate(userIdParamSchema, 'params'),
  validate(updateUserStatusSchema),
  auditLog({ actionType: 'UPDATE_USER_STATUS', resourceType: 'user' }),
  controller.updateStatus,
);

// POST /api/v1/users/:userId/suspend
router.post(
  '/:userId/suspend',
  authenticate,
  authorize(['System Admin', 'Hospital Admin']),
  validate(userIdParamSchema, 'params'),
  auditLog({ actionType: 'SUSPEND_USER', resourceType: 'user' }),
  controller.suspend,
);

// POST /api/v1/users/:userId/reactivate
router.post(
  '/:userId/reactivate',
  authenticate,
  authorize(['System Admin', 'Hospital Admin']),
  validate(userIdParamSchema, 'params'),
  auditLog({ actionType: 'REACTIVATE_USER', resourceType: 'user' }),
  controller.reactivate,
);

// DELETE /api/v1/users/:userId
router.delete(
  '/:userId',
  authenticate,
  authorize(['System Admin']),
  validate(userIdParamSchema, 'params'),
  auditLog({ actionType: 'DELETE_USER', resourceType: 'user' }),
  controller.delete,
);

export default router;
