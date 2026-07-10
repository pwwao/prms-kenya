/**
 * PRMS Kenya — Application Constants
 */

// ─── Kenya Counties ───────────────────────────────────────────────────────────
export const KENYA_COUNTIES = [
  'Baringo', 'Bomet', 'Bungoma', 'Busia', 'Elgeyo Marakwet',
  'Embu', 'Garissa', 'Homa Bay', 'Isiolo', 'Kajiado',
  'Kakamega', 'Kericho', 'Kiambu', 'Kilifi', 'Kirinyaga',
  'Kisii', 'Kisumu', 'Kitui', 'Kwale', 'Laikipia',
  'Lamu', 'Machakos', 'Makueni', 'Mandera', 'Marsabit',
  'Meru', 'Migori', 'Mombasa', 'Murang\'a', 'Nairobi',
  'Nakuru', 'Nandi', 'Narok', 'Nyamira', 'Nyandarua',
  'Nyeri', 'Samburu', 'Siaya', 'Taita Taveta', 'Tana River',
  'Tharaka Nithi', 'Trans Nzoia', 'Turkana', 'Uasin Gishu', 'Vihiga',
  'Wajir', 'West Pokot',
] as const;

export type KenyaCounty = typeof KENYA_COUNTIES[number];

// ─── Facility Levels ─────────────────────────────────────────────────────────
export const FACILITY_LEVELS = [
  'Level 2', 'Level 3', 'Level 4', 'Level 5', 'Level 6',
] as const;

// ─── Referral Statuses ────────────────────────────────────────────────────────
export const REFERRAL_STATUS_LABELS = {
  Draft: 'Draft',
  Dispatched: 'Dispatched',
  Received: 'Received',
  Accepted: 'Accepted',
  Rejected: 'Rejected',
  Completed: 'Completed',
} as const;

// ─── Urgency Levels ───────────────────────────────────────────────────────────
export const URGENCY_LEVELS = ['Routine', 'Urgent', 'Emergent'] as const;

// ─── ID Types ─────────────────────────────────────────────────────────────────
export const ID_TYPES = [
  'National ID',
  'Alien ID',
  'Birth Certificate',
] as const;

// ─── App Config ───────────────────────────────────────────────────────────────
// BUG FIX: API URL was hardcoded to the production endpoint.
// Now reads from react-native-config (PRMS_API_BASE_URL / PRMS_WS_URL)
// with the production URL as the fallback so existing builds are unaffected.
// For local development create a .env file with:
//   PRMS_API_BASE_URL=http://10.0.2.2:3000/api/v1   (Android emulator)
//   PRMS_API_BASE_URL=http://localhost:3000/api/v1   (iOS simulator)
//   PRMS_WS_URL=http://10.0.2.2:3000
import Config from 'react-native-config';
export const APP_CONFIG = {
  API_BASE_URL: Config.PRMS_API_BASE_URL ?? 'https://api.prms.health.go.ke/api/v1',
  WS_URL: Config.PRMS_WS_URL ?? 'wss://api.prms.health.go.ke',
  ACCESS_TOKEN_LIFETIME_MS: 15 * 60 * 1000,       // 15 minutes
  REFRESH_TOKEN_LIFETIME_MS: 7 * 24 * 60 * 60 * 1000, // 7 days
  SYNC_INTERVAL_MS: 5 * 60 * 1000,                 // 5 minutes
  SYNC_RETRY_DELAY_MS: 30 * 1000,                  // 30 seconds
  TYPING_DEBOUNCE_MS: 1000,
  MAX_MESSAGE_LENGTH: 5000,
  MIN_REFERRAL_REASON_LENGTH: 20,
  MIN_CLINICAL_SUMMARY_LENGTH: 50,
  MIN_REJECTION_REASON_LENGTH: 15,
  MESSAGES_PER_PAGE: 50,
  REFERRALS_PER_PAGE: 20,
  PATIENTS_PER_PAGE: 20,
  NOTIFICATIONS_PER_PAGE: 30,
} as const;

// ─── Storage Keys ─────────────────────────────────────────────────────────────
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'prms_access_token',
  REFRESH_TOKEN: 'prms_refresh_token',
  USER: 'prms_user',
  LAST_SYNCED_AT: 'prms_last_synced_at',
  DEVICE_ID: 'prms_device_id',
  BIOMETRIC_ENABLED: 'prms_biometric_enabled',
} as const;

// ─── Navigation Route Names ───────────────────────────────────────────────────
export const ROUTES = {
  // Auth Stack
  SPLASH: 'Splash',
  LOGIN: 'Login',
  VERIFY_2FA: 'Verify2FA',
  FORGOT_PASSWORD: 'ForgotPassword',
  CHANGE_PASSWORD: 'ChangePassword',

  // Main (role-gated tabs)
  MAIN_TABS: 'MainTabs',

  // Tab roots
  DASHBOARD_TAB: 'DashboardTab',
  REFERRALS_TAB: 'ReferralsTab',
  NOTIFICATIONS_TAB: 'NotificationsTab',
  PROFILE_TAB: 'ProfileTab',

  // Dashboard Stack
  DASHBOARD: 'Dashboard',

  // Referral Stack
  REFERRAL_LIST: 'ReferralList',
  REFERRAL_DETAIL: 'ReferralDetail',
  REFERRAL_TIMELINE: 'ReferralTimeline',
  CREATE_REFERRAL: 'CreateReferral',
  CHAT: 'Chat',

  // Patient Stack
  PATIENT_SEARCH: 'PatientSearch',
  PATIENT_REGISTRATION: 'PatientRegistration',
  PATIENT_DETAIL: 'PatientDetail',

  // Notifications
  NOTIFICATIONS: 'Notifications',

  // Profile
  PROFILE: 'Profile',
} as const;

// ─── Error Codes ─────────────────────────────────────────────────────────────
export const API_ERROR_CODES = {
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_ACCOUNT_SUSPENDED: 'AUTH_ACCOUNT_SUSPENDED',
  AUTH_2FA_INVALID_OTP: 'AUTH_2FA_INVALID_OTP',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  RESOURCE_ALREADY_EXISTS: 'RESOURCE_ALREADY_EXISTS',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_INVALID_STATE_TRANSITION: 'RESOURCE_INVALID_STATE_TRANSITION',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
} as const;
