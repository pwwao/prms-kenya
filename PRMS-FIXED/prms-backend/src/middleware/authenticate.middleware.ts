/**
 * Authentication Middleware — JWT RS256 Validation
 *
 * Architecture Contract §10.1, §2.2:
 * - Validates JWT signature, expiry, issuer, audience.
 * - Checks Redis blacklist (revoked tokens).
 * - Attaches decoded claims to req.user.
 * - Route handlers must NOT call this on public endpoints.
 */

import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../shared/services/token.service.js';
import { AuthError } from '../shared/errors/domain.errors.js';
import type { TUserRole } from '../config/jwt.config.js';

// ─── Augment Express Request ──────────────────────────────────────────────────

declare global {
  namespace Express {
    interface Request {
      /** Attached by authenticate middleware. Undefined on public routes. */
      user?: IAuthenticatedUser;
    }
  }
}

export interface IAuthenticatedUser {
  /** Numeric user ID (parsed from JWT `sub` claim) */
  userId: number;
  /** RBAC role */
  role: TUserRole;
  /** Hospital ID — null for System Admin */
  hospitalId: number | null;
  /** JWT ID for blacklisting */
  jti: string;
  /** Token expiry Unix timestamp */
  exp: number;
}

// ─── Middleware ───────────────────────────────────────────────────────────────

/**
 * Validates the Bearer token in the Authorization header.
 * Attaches decoded claims to `req.user`.
 *
 * @throws AuthError (401) if token is missing, invalid, expired, or revoked.
 *
 * @example
 * router.get('/referrals', authenticate, authorize(['Clinician']), handler);
 */
export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthError(
        'Authorization header missing or malformed. Expected: Bearer <token>',
        'AUTH_TOKEN_INVALID',
      );
    }

    const token = authHeader.slice(7); // strip 'Bearer '

    const decoded = await verifyAccessToken(token);

    req.user = {
      userId: parseInt(decoded.sub, 10),
      role: decoded.role,
      hospitalId: decoded.hospitalId,
      jti: decoded.jti,
      exp: decoded.exp,
    };

    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Optional authentication — attaches user if a valid token is present,
 * but does not reject the request if no token is provided.
 * Used for endpoints that have mixed public/authenticated behaviour.
 */
export async function authenticateOptional(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const decoded = await verifyAccessToken(token);
      req.user = {
        userId: parseInt(decoded.sub, 10),
        role: decoded.role,
        hospitalId: decoded.hospitalId,
        jti: decoded.jti,
        exp: decoded.exp,
      };
    }
    next();
  } catch {
    // Silently ignore auth failures for optional auth routes
    next();
  }
}
