export type UserRole = 'System Admin' | 'Hospital Admin' | 'Clinician' | 'Receptionist';
export type UserStatus = 'Active' | 'Inactive' | 'Suspended';

export interface UserSummary {
  id: number;
  username: string;
  fullName: string;
  role: UserRole;
  hospitalId: number | null;
  hospitalName: string | null;
  isFirstLogin: boolean;
}

export interface User extends UserSummary {
  email: string;
  phoneNumber: string;
  facilityLevel?: string;
  county?: string;
  isTwoFactorEnabled: boolean;
  status: UserStatus;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: UserSummary;
}

export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface TwoFactorRequiredResponse {
  status: '2FA_REQUIRED';
  preAuthToken: string;
  deliveryMethod: 'TOTP' | 'SMS';
}

export interface Verify2FARequest {
  preAuthToken: string;
  otpCode: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  resetToken: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}
