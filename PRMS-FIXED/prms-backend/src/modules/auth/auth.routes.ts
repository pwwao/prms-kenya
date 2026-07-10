/**
 * Auth Routes
 * Architecture Contract §8.7 / OpenAPI v1.0 — Authentication endpoints.
 */

import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { AuthRepository } from './auth.repository.js';
import { UserRepository } from '../users/users.repository.js';
import { UserService } from '../users/users.service.js';
import { HospitalRepository } from '../hospitals/hospitals.repository.js';
import { CacheService } from '../../shared/services/cache.service.js';
import { authenticate } from '../../middleware/authenticate.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { auditLog } from '../../middleware/audit.middleware.js';
import {
  loginRateLimiter,
  verify2faRateLimiter,
  forgotPasswordRateLimiter,
} from '../../middleware/rate-limit.middleware.js';
import {
  loginSchema,
  verify2faSchema,
  refreshSchema,
  logoutSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  registerDeviceSchema,
} from './auth.validator.js';

// ─── Dependency wiring ─────────────────────────────────────────────────────
// Follows the same manual-construction pattern as every other module's
// routes.ts (see users.routes.ts) — no DI framework in this codebase.

const authRepo       = new AuthRepository();
const userRepo       = new UserRepository();
const hospitalRepo   = new HospitalRepository();
const cache          = new CacheService();
const userService    = new UserService(userRepo, hospitalRepo, cache);
const service        = new AuthService(authRepo, userRepo, userService, hospitalRepo);
const controller     = new AuthController(service);

const router = Router();

// POST /api/v1/auth/login
// 5 attempts / 15 min, only counting failures — Architecture Contract §8.6.
router.post(
  '/login',
  loginRateLimiter,
  validate(loginSchema),
  controller.login,
);

// POST /api/v1/auth/verify-2fa
// 3 attempts / 5 min, only counting failures.
router.post(
  '/verify-2fa',
  verify2faRateLimiter,
  validate(verify2faSchema),
  controller.verify2fa,
);

// POST /api/v1/auth/refresh
router.post(
  '/refresh',
  validate(refreshSchema),
  controller.refresh,
);

// POST /api/v1/auth/logout
router.post(
  '/logout',
  validate(logoutSchema),
  auditLog({ actionType: 'USER_LOGOUT', resourceType: 'user' }),
  controller.logout,
);

// GET /api/v1/auth/me
router.get(
  '/me',
  authenticate,
  controller.me,
);

// POST /api/v1/auth/forgot-password
// 3 attempts / 60 min — Architecture Contract §8.6.
router.post(
  '/forgot-password',
  forgotPasswordRateLimiter,
  validate(forgotPasswordSchema),
  controller.forgotPassword,
);

// POST /api/v1/auth/reset-password
router.post(
  '/reset-password',
  validate(resetPasswordSchema),
  auditLog({ actionType: 'PASSWORD_RESET_COMPLETED', resourceType: 'user' }),
  controller.resetPassword,
);

// PATCH /api/v1/auth/change-password
router.patch(
  '/change-password',
  authenticate,
  validate(changePasswordSchema),
  auditLog({ actionType: 'PASSWORD_CHANGED', resourceType: 'user' }),
  controller.changePassword,
);

// POST /api/v1/auth/register-device
router.post(
  '/register-device',
  authenticate,
  validate(registerDeviceSchema),
  controller.registerDevice,
);

export { router as authRouter };
