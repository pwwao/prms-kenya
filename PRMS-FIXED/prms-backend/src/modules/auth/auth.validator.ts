/**
 * Auth Validator — Zod schemas for all auth routes.
 * Architecture Contract §6.1, §10.6 — Zod parsing on all inputs.
 */

import { z } from 'zod';

// ─── Login ────────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  // Accepts either username or email — AuthService.login() tries both.
  identifier: z.string().trim().min(1, 'Username or email is required'),
  password:   z.string().min(1, 'Password is required'),
});

// ─── 2FA ──────────────────────────────────────────────────────────────────────

export const verify2faSchema = z.object({
  preAuthToken: z.string().min(1, 'preAuthToken is required'),
  otpCode:      z.string().trim().regex(/^\d{6}$/, 'OTP must be a 6-digit code'),
});

// ─── Refresh / Logout ────────────────────────────────────────────────────────

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'refreshToken is required'),
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(1, 'refreshToken is required'),
});

// ─── Password reset ──────────────────────────────────────────────────────────
// OpenAPI v1.0 §/auth/reset-password, §/auth/change-password — both require
// minLength 12 and a confirmPassword field (stricter than the shared 8-char
// passwordSchema in common.schemas.ts, which governs general account
// creation rather than these two specific reset/change flows).

const newPasswordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one digit')
  .regex(/[@$!%*?&]/, 'Password must contain at least one special character (@$!%*?&)');

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Must be a valid email address'),
});

export const resetPasswordSchema = z.object({
  resetToken:      z.string().min(1, 'resetToken is required'),
  newPassword:     newPasswordSchema,
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'currentPassword is required'),
  newPassword:     newPasswordSchema,
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
}).refine((d) => d.currentPassword !== d.newPassword, {
  message: 'New password must differ from current password',
  path: ['newPassword'],
});

// ─── Device registration ────────────────────────────────────────────────────

export const registerDeviceSchema = z.object({
  deviceId: z.string().trim().min(1).max(100),
  fcmToken: z.string().trim().max(500).optional().nullable(),
  platform: z.enum(['android', 'ios', 'web']),
});

// ─── Types ───────────────────────────────────────────────────────────────────

export type TLoginInput           = z.infer<typeof loginSchema>;
export type TVerify2faInput       = z.infer<typeof verify2faSchema>;
export type TRefreshInput         = z.infer<typeof refreshSchema>;
export type TLogoutInput          = z.infer<typeof logoutSchema>;
export type TForgotPasswordInput  = z.infer<typeof forgotPasswordSchema>;
export type TResetPasswordInput   = z.infer<typeof resetPasswordSchema>;
export type TChangePasswordInput  = z.infer<typeof changePasswordSchema>;
export type TRegisterDeviceInput  = z.infer<typeof registerDeviceSchema>;
