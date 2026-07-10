/**
 * RBAC Authorisation Middleware
 *
 * Architecture Contract §10.3 — Permission matrix enforcement.
 * §10.3 Facility Isolation Rule:
 *   "Hospital Admin, Clinician, and Receptionist can ONLY see data belonging
 *    to their registered hospitalId. hospitalId is extracted from the verified
 *    JWT — it cannot be overridden by the client."
 *
 * Must be applied AFTER authenticate middleware.
 */

import type { Request, Response, NextFunction } from 'express';
import type { TUserRole } from '../config/jwt.config.js';
import { ForbiddenError } from '../shared/errors/domain.errors.js';

// ─── Permission Matrix ────────────────────────────────────────────────────────
// Architecture Contract §10.3 — exact mapping of the contract table.

export type TPermission =
  | 'hospital:register'
  | 'hospital:approve'
  | 'hospital:view_all'
  | 'hospital:view_own'
  | 'user:create'
  | 'user:view'
  | 'user:suspend'
  | 'patient:register'
  | 'patient:view_unmasked'
  | 'patient:view_masked'
  | 'referral:create'
  | 'referral:dispatch'
  | 'referral:receive'
  | 'referral:view'
  | 'chat:access'
  | 'audit:view'
  | 'report:view';

const ROLE_PERMISSIONS: Record<TUserRole, Set<TPermission>> = {
  'System Admin': new Set([
    'hospital:register',
    'hospital:approve',
    'hospital:view_all',
    'user:view',
    'audit:view',
    'report:view',
  ]),
  'Hospital Admin': new Set([
    'hospital:register',
    'hospital:view_own',
    'user:create',
    'user:view',
    'user:suspend',
    'report:view',
  ]),
  'Clinician': new Set([
    'hospital:register',
    'hospital:view_own',
    'patient:register',
    'patient:view_unmasked',
    'referral:create',
    'referral:dispatch',
    'referral:receive',
    'referral:view',
    'chat:access',
    'report:view',
  ]),
  'Receptionist': new Set([
    'hospital:register',
    'hospital:view_own',
    'patient:register',
    'patient:view_masked',
    'referral:dispatch',
    'referral:receive',
    'referral:view',
  ]),
};

// ─── Middleware factory ───────────────────────────────────────────────────────

/**
 * Returns middleware that enforces role-based access control.
 * Must be used after `authenticate`.
 *
 * @param requiredRoles - One or more roles that may access this route.
 *                        If the user's role is not in this list → 403.
 *
 * @example
 * router.get('/hospitals', authenticate, authorize(['System Admin']), handler);
 * router.post('/referrals', authenticate, authorize(['Clinician']), handler);
 */
export function authorize(requiredRoles: TUserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new ForbiddenError('Authentication required before authorisation'));
    }

    const { role } = req.user;

    if (!requiredRoles.includes(role)) {
      return next(
        new ForbiddenError(
          `Role '${role}' is not permitted to access this resource`,
          'AUTH_INSUFFICIENT_PERMISSIONS',
        ),
      );
    }

    next();
  };
}

/**
 * Returns middleware that enforces a specific permission check.
 * More granular than role check — checks the permission matrix directly.
 *
 * @param permission - The specific permission required
 *
 * @example
 * router.get('/audit-logs', authenticate, requirePermission('audit:view'), handler);
 */
export function requirePermission(permission: TPermission) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new ForbiddenError('Authentication required before authorisation'));
    }

    const rolePerms = ROLE_PERMISSIONS[req.user.role];
    if (!rolePerms.has(permission)) {
      return next(
        new ForbiddenError(
          `Permission '${permission}' denied for role '${req.user.role}'`,
          'AUTH_INSUFFICIENT_PERMISSIONS',
        ),
      );
    }

    next();
  };
}

/**
 * Facility isolation guard.
 * Verifies that the hospitalId in the JWT matches the hospitalId being accessed.
 * System Admin bypasses this check.
 *
 * Call this inside route handlers after extracting the target hospitalId,
 * or use the `enforceFacilityIsolation` middleware factory below.
 *
 * @param requestingUser  - The authenticated user from req.user
 * @param targetHospitalId - The hospitalId of the resource being accessed
 * @throws ForbiddenError if isolation is violated
 */
export function assertFacilityAccess(
  requestingUser: { role: TUserRole; hospitalId: number | null },
  targetHospitalId: number,
): void {
  if (requestingUser.role === 'System Admin') return; // System Admin sees all

  if (requestingUser.hospitalId !== targetHospitalId) {
    throw new ForbiddenError(
      'Access denied: you can only access resources belonging to your facility',
      'AUTH_INSUFFICIENT_PERMISSIONS',
    );
  }
}

/**
 * Middleware that enforces facility isolation using a request parameter.
 * Reads the target hospitalId from `req.params[paramName]`.
 *
 * @param paramName - The route parameter containing the hospitalId (default: 'hospitalId')
 *
 * @example
 * router.get('/hospitals/:hospitalId/users', authenticate, enforceFacilityIsolation(), handler);
 */
export function enforceFacilityIsolation(paramName = 'hospitalId') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new ForbiddenError('Authentication required'));
    }

    if (req.user.role === 'System Admin') return next();

    const raw = req.params[paramName];
    const targetId = parseInt(raw ?? '', 10);

    if (isNaN(targetId)) {
      return next(new ForbiddenError('Invalid facility identifier in route'));
    }

    try {
      assertFacilityAccess(req.user, targetId);
      next();
    } catch (err) {
      next(err);
    }
  };
}

// ─── Utility ──────────────────────────────────────────────────────────────────

/**
 * Checks if a user has a given permission.
 * Used in service layer for conditional logic (not middleware).
 */
export function hasPermission(role: TUserRole, permission: TPermission): boolean {
  return ROLE_PERMISSIONS[role]?.has(permission) ?? false;
}
