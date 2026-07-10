/**
 * Auth API calls — maps 1:1 to PRMS_API_Reference_v1.0.md "MODULE 1 — AUTHENTICATION"
 */

import { apiClient } from '@/shared/api/api-client';
import type {
  ApiSuccess,
} from '@/types/api.types';
import type {
  AuthTokens,
  TwoFactorRequiredResponse,
  LoginRequest,
  Verify2FARequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  ChangePasswordRequest,
  User,
} from '@/types/auth.types';

type LoginResponse = AuthTokens | TwoFactorRequiredResponse;

export const authApi = {
  login: async (payload: LoginRequest) => {
    const { data } = await apiClient.post<ApiSuccess<LoginResponse>>('/auth/login', payload);
    return data.data;
  },

  verify2FA: async (payload: Verify2FARequest) => {
    const { data } = await apiClient.post<ApiSuccess<AuthTokens>>('/auth/verify-2fa', payload);
    return data.data;
  },

  refresh: async (refreshToken: string) => {
    const { data } = await apiClient.post<ApiSuccess<{ accessToken: string; expiresIn: number }>>(
      '/auth/refresh',
      { refreshToken }
    );
    return data.data;
  },

  logout: async (refreshToken: string) => {
    await apiClient.post('/auth/logout', { refreshToken });
  },

  forgotPassword: async (payload: ForgotPasswordRequest) => {
    const { data } = await apiClient.post<ApiSuccess<null>>('/auth/forgot-password', payload);
    return data.message;
  },

  resetPassword: async (payload: ResetPasswordRequest) => {
    const { data } = await apiClient.post<ApiSuccess<null>>('/auth/reset-password', payload);
    return data.message;
  },

  changePassword: async (payload: ChangePasswordRequest) => {
    const { data } = await apiClient.patch<ApiSuccess<null>>('/auth/change-password', payload);
    return data.message;
  },

  getMe: async () => {
    const { data } = await apiClient.get<ApiSuccess<User>>('/auth/me');
    return data.data;
  },
};

export function isTwoFactorResponse(
  response: LoginResponse
): response is TwoFactorRequiredResponse {
  return 'status' in response && response.status === '2FA_REQUIRED';
}
