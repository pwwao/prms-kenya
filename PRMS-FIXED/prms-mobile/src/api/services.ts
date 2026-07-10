/**
 * PRMS API Services
 * All REST calls, exactly matching PRMS_API_Reference_v1_0.md
 */

import apiClient from './client';
import type {
  ApiSuccess,
  AuthUser,
  AuthTokens,
  LoginRequest,
  LoginResponse,
  Verify2FARequest,
  Patient,
  CreatePatientRequest,
  Referral,
  CreateReferralRequest,
  UpdateReferralStatusRequest,
  ChatMessage,
  AppNotification,
  Hospital,
  SyncRequest,
  SyncResponse,
  Pagination,
} from '@types/index';

// ─── Response wrapper types ───────────────────────────────────────────────────

interface PaginatedData<T> {
  items: T[];
  pagination: Pagination;
}

// ─── Auth Service ─────────────────────────────────────────────────────────────

export const authApi = {
  login: (data: LoginRequest) =>
    apiClient.post<ApiSuccess<LoginResponse>>('/auth/login', data),

  verify2FA: (data: Verify2FARequest) =>
    apiClient.post<ApiSuccess<AuthTokens & { user: AuthUser }>>('/auth/verify-2fa', data),

  refresh: (refreshToken: string) =>
    apiClient.post<ApiSuccess<{ accessToken: string; expiresIn: number }>>('/auth/refresh', {
      refreshToken,
    }),

  logout: (refreshToken: string) =>
    apiClient.post<ApiSuccess<null>>('/auth/logout', { refreshToken }),

  getMe: () =>
    apiClient.get<ApiSuccess<AuthUser>>('/auth/me'),

  forgotPassword: (email: string) =>
    apiClient.post<ApiSuccess<null>>('/auth/forgot-password', { email }),

  resetPassword: (data: {
    resetToken: string;
    newPassword: string;
    confirmPassword: string;
  }) => apiClient.post<ApiSuccess<null>>('/auth/reset-password', data),

  changePassword: (data: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => apiClient.patch<ApiSuccess<null>>('/auth/change-password', data),

  registerDevice: (data: {
    fcmToken: string;
    deviceId: string;
    platform: 'android' | 'ios';
  }) => apiClient.post<ApiSuccess<null>>('/auth/register-device', data),
};

// ─── Patients Service ─────────────────────────────────────────────────────────

export const patientsApi = {
  create: (data: CreatePatientRequest) =>
    apiClient.post<ApiSuccess<Patient & { maskedRecord: Record<string, string> }>>('/patients', data),

  search: (params: { q: string; page?: number; limit?: number }) =>
    apiClient.get<ApiSuccess<Patient[]>>('/patients', { params }),

  getById: (patientId: number) =>
    apiClient.get<ApiSuccess<Patient>>(`/patients/${patientId}`),
};

// ─── Hospitals Service ────────────────────────────────────────────────────────

export const hospitalsApi = {
  search: (params: { q?: string; facilityLevel?: string; county?: string }) =>
    apiClient.get<ApiSuccess<Hospital[]>>('/hospitals', { params }),

  getById: (hospitalId: number) =>
    apiClient.get<ApiSuccess<Hospital>>(`/hospitals/${hospitalId}`),
};

// ─── Referrals Service ────────────────────────────────────────────────────────

export const referralsApi = {
  create: (data: CreateReferralRequest) =>
    apiClient.post<ApiSuccess<Referral>>('/referrals', data),

  list: (params?: {
    direction?: 'incoming' | 'outgoing';
    status?: string;
    urgencyLevel?: string;
    q?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortDir?: string;
  }) => apiClient.get<ApiSuccess<Referral[]>>('/referrals', { params }),

  getById: (referralId: number) =>
    apiClient.get<ApiSuccess<Referral>>(`/referrals/${referralId}`),

  updateStatus: (referralId: number, data: UpdateReferralStatusRequest) =>
    apiClient.patch<ApiSuccess<{
      id: number;
      referralCode: string;
      previousStatus: string;
      currentStatus: string;
      updatedAt: string;
    }>>(`/referrals/${referralId}/status`, data),
};

// ─── Messages / Chat Service ──────────────────────────────────────────────────

export const messagesApi = {
  getHistory: (
    referralId: number,
    params?: { page?: number; limit?: number; before?: string },
  ) => apiClient.get<ApiSuccess<ChatMessage[]>>(
    `/referrals/${referralId}/messages`,
    { params },
  ),
};

// ─── Notifications Service ────────────────────────────────────────────────────

export const notificationsApi = {
  list: (params?: { isRead?: boolean; page?: number; limit?: number }) =>
    apiClient.get<ApiSuccess<AppNotification[]>>('/notifications', { params }),

  markRead: (notificationId: number) =>
    apiClient.patch<ApiSuccess<{ id: number; isRead: boolean }>>(
      `/notifications/${notificationId}/read`,
    ),

  markAllRead: () =>
    apiClient.patch<ApiSuccess<{ updatedCount: number }>>('/notifications/read-all'),
};

// ─── Sync Service ─────────────────────────────────────────────────────────────

export const syncApi = {
  sync: (data: SyncRequest) =>
    apiClient.post<ApiSuccess<SyncResponse>>('/sync', data),
};
