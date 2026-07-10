/**
 * Centralized route path constants.
 * Never hardcode route strings elsewhere — import from here.
 * Mirrors Architecture Contract §10.1 (Web Admin Route Map).
 */

export const ROUTES = {
  ROOT: '/',
  LOGIN: '/login',
  VERIFY_2FA: '/login/verify',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',

  DASHBOARD: '/dashboard',

  PATIENTS: '/patients',
  PATIENT_NEW: '/patients/new',
  PATIENT_DETAIL: (id: number | string = ':patientId') => `/patients/${id}`,

  REFERRALS: '/referrals',
  REFERRAL_NEW: '/referrals/new',
  REFERRAL_DETAIL: (id: number | string = ':referralId') => `/referrals/${id}`,
  REFERRAL_CHAT: (id: number | string = ':referralId') => `/referrals/${id}/chat`,

  NOTIFICATIONS: '/notifications',

  HOSPITALS: '/hospitals',
  HOSPITAL_DETAIL: (id: number | string = ':hospitalId') => `/hospitals/${id}`,

  USERS: '/users',
  USER_NEW: '/users/new',
  USER_EDIT: (id: number | string = ':userId') => `/users/${id}/edit`,

  REPORTS: '/reports',
  AUDIT_LOGS: '/audit-logs',

  PROFILE: '/profile',
  UNAUTHORIZED: '/unauthorized',
  NOT_FOUND: '/404',
} as const;
