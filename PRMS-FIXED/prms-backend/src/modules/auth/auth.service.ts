/**
 * Auth Service
 *
 * Architecture Contract §4.2 — business logic for the Auth module.
 * Endpoints implemented (OpenAPI v1.0 / Architecture Contract §8.7):
 *   POST   /auth/login
 *   POST   /auth/verify-2fa
 *   POST   /auth/refresh
 *   POST   /auth/logout
 *   GET    /auth/me
 *   POST   /auth/forgot-password
 *   POST   /auth/reset-password
 *   PATCH  /auth/change-password
 *   POST   /auth/register-device
 *
 * Delegates to UserService.changePassword() for the change-password flow
 * rather than duplicating that logic — same operation, two route entry
 * points (PATCH /users/:userId/password and PATCH /auth/change-password).
 */

import bcrypt from 'bcrypt';
import { randomBytes, randomInt } from 'crypto';
import { BaseService } from '../../shared/base.service.js';
import { AuthRepository } from './auth.repository.js';
import { UserRepository, type IUserRow } from '../users/users.repository.js';
import { UserService } from '../users/users.service.js';
import { HospitalRepository } from '../hospitals/hospitals.repository.js';
import {
  issueTokenPair,
  issuePreAuthToken,
  verifyPreAuthToken,
  verifyRefreshToken,
  verifyAccessToken,
  revokeAccessToken,
  registerSession,
  destroySession,
} from '../../shared/services/token.service.js';
import { decryptNullable } from '../../shared/services/crypto.service.js';
import { sendSms } from '../notifications/channels/sms.channel.js';
import { sendEmail } from '../notifications/channels/email.channel.js';
import { getRedisClient, RedisKeys, REDIS_TTL } from '../../config/redis.config.js';
import { env } from '../../config/env.config.js';
import { AuthError } from '../../shared/errors/domain.errors.js';

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface IUserSummary {
  id: number;
  username: string;
  fullName: string | null;
  role: IUserRow['role'];
  hospitalId: number | null;
  hospitalName: string | null;
  isFirstLogin: boolean;
}

export interface IAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: IUserSummary;
}

export interface ILoginResult {
  /** Present when the account does not have 2FA enabled — login is complete. */
  tokens?: IAuthTokens;
  /** Present when 2FA is required — client must call /auth/verify-2fa next. */
  preAuthToken?: string;
  twoFactorRequired: boolean;
  /** deliveryMethod matches the OpenAPI spec: 'TOTP' | 'SMS'. */
  deliveryMethod?: 'TOTP' | 'SMS';
}

export interface IAuthUserDTO {
  id: number;
  hospitalId: number | null;
  username: string;
  email: string;
  role: IUserRow['role'];
  fullName: string | null;
  phoneNumber: string | null;
  isTwoFactorEnabled: boolean;
  status: IUserRow['status'];
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class AuthService extends BaseService {
  protected readonly moduleName = 'auth';

  constructor(
    private readonly authRepo: AuthRepository,
    private readonly userRepo: UserRepository,
    private readonly userService: UserService,
    private readonly hospitalRepo: HospitalRepository,
  ) {
    super();
  }

  // ── Login ─────────────────────────────────────────────────────────────────

  /**
   * Step 1 of login. Verifies username/email + password. If the account has
   * 2FA enabled, issues a short-lived pre-auth token and (for SMS-based 2FA)
   * sends the OTP code. Otherwise completes login immediately.
   */
  async login(identifier: string, password: string): Promise<ILoginResult> {
    const row =
      (await this.userRepo.findByEmail(identifier)) ??
      (await this.userRepo.findByUsername(identifier));

    // Constant-shape response whether the user exists or not, to avoid
    // leaking which identifiers are registered.
    if (!row) {
      throw new AuthError('Invalid username/email or password', 'AUTH_INVALID_CREDENTIALS');
    }

    const passwordValid = await bcrypt.compare(password, row.password_hash);
    if (!passwordValid) {
      throw new AuthError('Invalid username/email or password', 'AUTH_INVALID_CREDENTIALS');
    }

    this.assertAccountIsUsable(row);

    if (row.is_two_factor_enabled === 1) {
      const preAuthToken = await issuePreAuthToken(row.id);
      const method = row.two_factor_secret ? 'TOTP' : 'SMS';

      if (method === 'SMS') {
        await this.issueSmsOtp(row);
      }

      return { twoFactorRequired: true, preAuthToken, deliveryMethod: method };
    }

    const tokens = await this.completeLogin(row);
    return { twoFactorRequired: false, tokens };
  }

  /**
   * Step 2 of login for accounts with 2FA enabled. Verifies the pre-auth
   * token (issued by login()) plus the 6-digit OTP, then completes login.
   */
  async verifyTwoFactor(preAuthToken: string, otpCode: string): Promise<IAuthTokens> {
    const userId = await verifyPreAuthToken(preAuthToken);
    const row = await this.userRepo.findByIdOrFail(userId);

    this.assertAccountIsUsable(row);

    const valid = row.two_factor_secret
      ? await this.verifyTotp(row.two_factor_secret, otpCode)
      : await this.verifySmsOtp(row.id, otpCode);

    if (!valid) {
      throw new AuthError('Invalid or expired verification code', 'AUTH_2FA_INVALID_OTP');
    }

    return this.completeLogin(row);
  }

  /** Issues tokens, persists the refresh token, registers the session, logs the event. */
  private async completeLogin(row: IUserRow): Promise<IAuthTokens> {
    const isFirstLogin = row.last_login_at === null;
    const tokenPair = issueTokenPair(row.id, row.role, row.hospital_id);

    // Resolve hospital name for the UserSummary (null for System Admin)
    let hospitalName: string | null = null;
    if (row.hospital_id !== null) {
      const hospital = await this.hospitalRepo.findById(row.hospital_id);
      hospitalName = hospital?.name ?? null;
    }

    const refreshJti = this.extractJti(tokenPair.refreshToken);
    await this.authRepo.createRefreshToken(
      row.id,
      refreshJti,
      new Date(Date.now() + env.JWT_REFRESH_EXPIRY * 1000),
      null,
    );
    await registerSession(row.id, 'web', row.role);
    await this.userRepo.updateLastLogin(row.id);

    this.publishEvent('USER_LOGGED_IN', { userId: row.id, role: row.role });
    this.logMutation('USER_LOGGED_IN', row.id, row.id);

    return {
      accessToken:  tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      expiresIn:    tokenPair.accessExpiresIn,
      user: {
        id:           row.id,
        username:     row.username,
        fullName:     decryptNullable(row.full_name_encrypted),
        role:         row.role,
        hospitalId:   row.hospital_id,
        hospitalName,
        isFirstLogin,
      },
    };
  }

  // ── Refresh / Logout ─────────────────────────────────────────────────────

  /**
   * Issues a new access token from a valid, non-revoked refresh token.
   * Per Architecture Contract §10.2, only the access token is rotated here;
   * the refresh token itself remains valid until its own 7-day expiry.
   */
  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
    const decoded = verifyRefreshToken(refreshToken);

    const stored = await this.authRepo.findRefreshTokenByJti(decoded.jti);
    if (!stored || stored.revoked_at !== null) {
      throw new AuthError('Refresh token has been revoked', 'AUTH_TOKEN_INVALID');
    }

    const userId = Number(decoded.sub);
    const row = await this.userRepo.findByIdOrFail(userId);
    this.assertAccountIsUsable(row);

    const tokens = issueTokenPair(row.id, row.role, row.hospital_id);
    return { accessToken: tokens.accessToken, expiresIn: tokens.accessExpiresIn };
  }

  /**
   * Logs out: blacklists the current access token (if provided) and revokes
   * the refresh token so it can no longer be used to mint new access tokens.
   */
  async logout(accessToken: string | null, refreshToken: string): Promise<void> {
    const decoded = verifyRefreshToken(refreshToken);
    await this.authRepo.revokeRefreshToken(decoded.jti);

    const userId = Number(decoded.sub);

    if (accessToken) {
      try {
        const verified = await verifyAccessToken(accessToken);
        await revokeAccessToken(verified.jti, verified.exp);
      } catch {
        // Access token already invalid/expired — nothing to blacklist, fine.
      }
    }

    await destroySession(userId, 'web');
    this.publishEvent('USER_LOGGED_OUT', { userId });
    this.logMutation('USER_LOGGED_OUT', userId, userId);
  }

  // ── Me ────────────────────────────────────────────────────────────────────

  /**
   * Returns the authenticated user's own profile, fully unmasked — viewing
   * your own record is never subject to the role-based PII masking that
   * applies when viewing *other* users (see users.service.ts applyDataMask,
   * which would incorrectly mask a Receptionist's own name/email).
   */
  async getMe(userId: number): Promise<IAuthUserDTO> {
    const row = await this.userRepo.findByIdOrFail(userId);
    return {
      id: row.id,
      hospitalId: row.hospital_id,
      username: row.username,
      email: row.email,
      role: row.role,
      fullName: decryptNullable(row.full_name_encrypted),
      phoneNumber: row.phone_number,
      isTwoFactorEnabled: row.is_two_factor_enabled === 1,
      status: row.status,
    };
  }

  // ── Password reset (forgot password — unauthenticated) ──────────────────

  /**
   * Always responds as if successful regardless of whether the email is
   * registered, to avoid leaking account existence. Sends a reset link by
   * email when the account does exist.
   */
  async forgotPassword(email: string): Promise<void> {
    const row = await this.userRepo.findByEmail(email);
    if (!row) return; // Silent no-op — same external behaviour either way.

    const token = randomBytes(32).toString('hex');
    const redis = getRedisClient();
    await redis.setex(RedisKeys.passwordReset(token), REDIS_TTL.PASSWORD_RESET, String(row.id));

    const resetUrl = `${env.API_BASE_URL.replace('/api/v1', '')}/reset-password?token=${token}`;
    const recipientName = decryptNullable(row.full_name_encrypted) ?? row.username;
    const textBody =
      `A password reset was requested for your PRMS account. ` +
      `This link expires in 15 minutes. If you did not request this, ignore this email.\n\n${resetUrl}`;

    await sendEmail({
      toAddress: row.email,
      toName: recipientName,
      subject: 'PRMS — Password Reset Request',
      text: textBody,
      html: `<p>${textBody.replace(/\n/g, '<br>')}</p>`,
    });

    this.logMutation('PASSWORD_RESET_REQUESTED', row.id, row.id);
  }

  /** Completes a password reset using the token issued by forgotPassword(). */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const redis = getRedisClient();
    const key = RedisKeys.passwordReset(token);
    const userId = await redis.get(key);

    if (!userId) {
      throw new AuthError('Reset token is invalid or has expired', 'AUTH_TOKEN_INVALID');
    }

    const id = Number(userId);
    const newHash = await bcrypt.hash(newPassword, env.BCRYPT_ROUNDS);
    await this.userRepo.updatePassword(id, newHash);
    await redis.del(key);

    // Force re-login everywhere — a password reset should invalidate
    // any sessions established before the reset.
    await this.authRepo.revokeAllRefreshTokensForUser(id);

    this.logMutation('PASSWORD_RESET_COMPLETED', id, id);
  }

  // ── Change password (authenticated — delegates to UserService) ──────────

  /**
   * PATCH /auth/change-password — same operation as
   * PATCH /users/:userId/password, exposed under /auth for clients that
   * expect it there per the OpenAPI spec. Delegates to the existing,
   * already-tested UserService.changePassword() rather than re-implementing
   * the same business rule twice.
   */
  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    await this.userService.changePassword(userId, currentPassword, newPassword, userId);
  }

  // ── Device registration ──────────────────────────────────────────────────

  async registerDevice(
    userId: number,
    deviceId: string,
    fcmToken: string | null,
    platform: 'android' | 'ios' | 'web',
  ): Promise<void> {
    await this.authRepo.upsertDeviceSession(userId, deviceId, fcmToken, platform);
    this.logMutation('DEVICE_REGISTERED', userId, userId, { deviceId, platform });
  }

  // ── Internal helpers ──────────────────────────────────────────────────────

  private assertAccountIsUsable(row: IUserRow): void {
    if (row.status === 'Suspended') {
      throw new AuthError('Your account has been suspended', 'AUTH_ACCOUNT_SUSPENDED');
    }
    if (row.status === 'Inactive') {
      throw new AuthError('Your account is inactive', 'AUTH_ACCOUNT_INACTIVE');
    }
  }

  /** Extracts the `jti` claim from a signed JWT without re-verifying it (already just issued). */
  private extractJti(token: string): string {
    const payloadB64 = token.split('.')[1];
    if (!payloadB64) throw new AuthError('Malformed token', 'AUTH_TOKEN_INVALID');
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8')) as { jti: string };
    return payload.jti;
  }

  /**
   * Verifies a TOTP code against the user's stored base32 secret.
   * NOTE: this repository has no existing TOTP library dependency (e.g.
   * `otplib`) — left as a clearly-marked stub rather than a fabricated
   * implementation. Add `otplib` (or equivalent) and replace this method
   * before enabling TOTP-based 2FA in production. SMS-based 2FA (below)
   * is fully implemented and does not depend on this.
   */
  private async verifyTotp(_secretBase32: string, _otp: string): Promise<boolean> {
    throw new AuthError(
      'TOTP verification is not yet implemented on this server — use SMS-based 2FA, ' +
        'or add a TOTP library (e.g. otplib) before enabling this account setting.',
      'AUTH_2FA_INVALID_OTP',
    );
  }

  /** Generates a 6-digit SMS OTP, stores it in Redis, and sends it via Africa's Talking. */
  private async issueSmsOtp(row: IUserRow): Promise<void> {
    if (!row.phone_number) {
      throw new AuthError(
        'Two-factor authentication is enabled but no phone number is on file',
        'AUTH_2FA_INVALID_OTP',
      );
    }

    const otp = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const redis = getRedisClient();
    await redis.setex(RedisKeys.smsOtp(row.id), REDIS_TTL.SMS_OTP, otp);

    await sendSms({
      phone: row.phone_number,
      message: `Your PRMS verification code is ${otp}. It expires in 5 minutes.`,
    });
  }

  /** Verifies and single-uses an SMS OTP previously issued by issueSmsOtp(). */
  private async verifySmsOtp(userId: number, otp: string): Promise<boolean> {
    const redis = getRedisClient();
    const key = RedisKeys.smsOtp(userId);
    const stored = await redis.get(key);

    if (!stored || stored !== otp) return false;

    await redis.del(key); // single-use
    return true;
  }
}
