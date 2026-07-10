/**
 * Auth Controller — HTTP I/O only, delegates to AuthService.
 */

import type { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service.js';
import { sendSuccess, sendNoContent } from '../../shared/response.helper.js';
import type {
  TLoginInput,
  TVerify2faInput,
  TRefreshInput,
  TLogoutInput,
  TForgotPasswordInput,
  TResetPasswordInput,
  TChangePasswordInput,
  TRegisterDeviceInput,
} from './auth.validator.js';

export class AuthController {
  constructor(private readonly service: AuthService) {}

  // POST /auth/login
  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = req.body as TLoginInput;
      const result = await this.service.login(body.identifier, body.password);

      if (result.twoFactorRequired) {
        // Shape matches TwoFactorRequiredResponse in web auth.types.ts + OpenAPI spec
        sendSuccess(res, {
          status: '2FA_REQUIRED',
          preAuthToken: result.preAuthToken,
          deliveryMethod: result.deliveryMethod,
        }, 'Two-factor verification required');
        return;
      }

      sendSuccess(res, result.tokens, 'Login successful');
    } catch (err) { next(err); }
  };

  // POST /auth/verify-2fa
  verify2fa = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = req.body as TVerify2faInput;
      // Field is otpCode per OpenAPI spec and web Verify2FARequest type
      const tokens = await this.service.verifyTwoFactor(body.preAuthToken, body.otpCode);
      sendSuccess(res, tokens, 'Login successful');
    } catch (err) { next(err); }
  };

  // POST /auth/refresh
  refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = req.body as TRefreshInput;
      const result = await this.service.refreshAccessToken(body.refreshToken);
      sendSuccess(res, result, 'Token refreshed');
    } catch (err) { next(err); }
  };

  // POST /auth/logout
  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = req.body as TLogoutInput;
      const authHeader = req.headers.authorization;
      const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
      await this.service.logout(accessToken, body.refreshToken);
      sendNoContent(res);
    } catch (err) { next(err); }
  };

  // GET /auth/me
  me = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await this.service.getMe(req.user!.userId);
      sendSuccess(res, user, 'Current user retrieved');
    } catch (err) { next(err); }
  };

  // POST /auth/forgot-password
  forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = req.body as TForgotPasswordInput;
      await this.service.forgotPassword(body.email);
      // Always 200, regardless of whether the email is registered —
      // see AuthService.forgotPassword() for the reasoning.
      sendSuccess(res, null, 'If that email is registered, a reset link has been sent');
    } catch (err) { next(err); }
  };

  // POST /auth/reset-password
  resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = req.body as TResetPasswordInput;
      await this.service.resetPassword(body.resetToken, body.newPassword);
      sendSuccess(res, null, 'Password reset successful');
    } catch (err) { next(err); }
  };

  // PATCH /auth/change-password
  changePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = req.body as TChangePasswordInput;
      await this.service.changePassword(req.user!.userId, body.currentPassword, body.newPassword);
      sendSuccess(res, null, 'Password changed successfully');
    } catch (err) { next(err); }
  };

  // POST /auth/register-device
  registerDevice = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = req.body as TRegisterDeviceInput;
      await this.service.registerDevice(req.user!.userId, body.deviceId, body.fcmToken ?? null, body.platform);
      sendSuccess(res, null, 'Device registered');
    } catch (err) { next(err); }
  };
}
