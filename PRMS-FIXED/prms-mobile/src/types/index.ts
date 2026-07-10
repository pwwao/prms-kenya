/**
 * PRMS Domain Types
 * Exact shapes from PRMS_API_Reference_v1_0.md
 */

// ─── Auth ─────────────────────────────────────────────────────────────────────

// BUG FIX: Role strings MUST match what the backend JWT contains exactly.
// Backend (jwt.config.ts TUserRole) uses: 'System Admin' | 'Hospital Admin' | 'Clinician' | 'Receptionist'
// The old 'HospitalAdmin' / 'SystemAdmin' (no space) never matched the JWT payload,
// causing isHospitalAdmin / isSystemAdmin to always return false in useAuth.
export type UserRole = 'Clinician' | 'Receptionist' | 'Hospital Admin' | 'System Admin';

export interface AuthUser {
  id: number;
  username: string;
  fullName: string;
  role: UserRole;
  hospitalId: number | null;
  hospitalName: string | null;
  isFirstLogin: boolean;
  email?: string;
  phoneNumber?: string;
  isTwoFactorEnabled?: boolean;
  status?: 'Active' | 'Inactive' | 'Suspended';
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface Verify2FARequest {
  preAuthToken: string;
  otpCode: string;
}

export interface LoginResponse {
  status?: '2FA_REQUIRED';
  preAuthToken?: string;
  deliveryMethod?: 'TOTP' | 'SMS';
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  user?: AuthUser;
}

// ─── Patient ──────────────────────────────────────────────────────────────────

export type IdType = 'National ID' | 'Alien ID' | 'Birth Certificate';
export type Gender = 'Male' | 'Female' | 'Other';

export interface Patient {
  id: number;
  fullName: string;
  nationalId?: string | null;
  idType?: IdType;
  gender: Gender;
  dateOfBirth?: string;
  age: number;
  county: string;
  phoneNumber?: string;
  createdAt?: string;
}

export interface PatientMasked {
  id: number;
  fullName: string;   // "Jane W. M."
  nationalId: string; // "XXXX6789"
  gender: Gender;
  age: number;
  county: string;
  phoneNumber?: string; // "071XXXX678"
}

export interface CreatePatientRequest {
  idType?: IdType;
  nationalId?: string;
  fullName: string;
  gender: Gender;
  dateOfBirth: string;
  county: string;
  phoneNumber?: string;
}

// ─── Referral ─────────────────────────────────────────────────────────────────

export type ReferralStatus =
  | 'Draft'
  | 'Dispatched'
  | 'Received'
  | 'Accepted'
  | 'Rejected'
  | 'Completed';

export type UrgencyLevel = 'Routine' | 'Urgent' | 'Emergent';
export type ReferralDirection = 'incoming' | 'outgoing';

export interface Hospital {
  id: number;
  name: string;
  facilityLevel: string;
  county?: string;
  mohCode?: string;
  subCounty?: string;
  status?: 'Pending' | 'Approved' | 'Suspended';
}

export interface ReferralCreatedBy {
  id: number;
  fullName: string;
  role: UserRole;
}

export interface ReferralTimelineEntry {
  status: ReferralStatus;
  previousStatus: ReferralStatus | null;
  actionBy: { id: number; fullName: string };
  notes: string | null;
  timestamp: string;
}

export interface Referral {
  id: number;
  referralCode: string;
  status: ReferralStatus;
  urgencyLevel: UrgencyLevel;
  direction?: ReferralDirection;
  reasonForReferral?: string;
  clinicalSummary?: string;
  rejectionReason?: string | null;
  patient: Patient | PatientMasked | {
    id: number;
    displayName: string;
    gender: Gender;
    age: number;
  };
  sourceHospital: Hospital;
  destinationHospital: Hospital;
  createdByUser?: ReferralCreatedBy;
  timeline?: ReferralTimelineEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateReferralRequest {
  patientId: number;
  destinationHospitalId: number;
  urgencyLevel: UrgencyLevel;
  reasonForReferral: string;
  clinicalSummary: string;
}

export interface UpdateReferralStatusRequest {
  status: ReferralStatus;
  notes?: string;
  rejectionReason?: string;
}

// ─── Messages / Chat ─────────────────────────────────────────────────────────

export interface MessageSender {
  id: number;
  fullName: string;
  hospitalName: string;
}

export interface ChatMessage {
  id: number;
  referralId: number;
  sender: MessageSender;
  content: string;
  isRead: boolean;
  createdAt: string;
  // Local-only tracking
  localId?: string;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
}

// ─── Notifications ────────────────────────────────────────────────────────────

export type NotificationType =
  | 'REFERRAL_DISPATCHED'
  | 'REFERRAL_RECEIVED'
  | 'REFERRAL_ACCEPTED'
  | 'REFERRAL_REJECTED'
  | 'REFERRAL_COMPLETED'
  | 'MESSAGE_RECEIVED'
  | 'HOSPITAL_APPROVED'
  | 'HOSPITAL_SUSPENDED'
  | 'ACCOUNT_SUSPENDED';

export interface AppNotification {
  id: number;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  data: {
    referralId?: number;
    referralCode?: string;
    hospitalId?: number;
  };
  createdAt: string;
}

// ─── API Response Envelope ───────────────────────────────────────────────────

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ApiMeta {
  timestamp: string;
  requestId: string;
  pagination?: Pagination;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  message: string;
  meta: ApiMeta;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Array<{ field: string; message: string }>;
  };
  meta: ApiMeta;
}

// ─── Sync ─────────────────────────────────────────────────────────────────────

export interface SyncRequest {
  lastSyncedAt: string;
  deviceId: string;
}

export interface SyncResponse {
  referrals: Partial<Referral>[];
  patients: Partial<Patient>[];
  notifications: Partial<AppNotification>[];
  serverTime: string;
}

// ─── Socket Events ────────────────────────────────────────────────────────────

export interface SocketNewMessage {
  id: number;
  referralId: number;
  sender: MessageSender;
  content: string;
  createdAt: string;
}

export interface SocketMessageDelivered {
  messageId: number;
  referralId: number;
}

export interface SocketMessageRead {
  messageId: number;
  referralId: number;
  readBy: { id: number; fullName: string };
  readAt: string;
}

export interface SocketUserTyping {
  referralId: number;
  user: { id: number; fullName: string };
}

export interface SocketReferralStatusChanged {
  referralId: number;
  referralCode: string;
  previousStatus: ReferralStatus;
  newStatus: ReferralStatus;
  changedBy: { id: number; fullName: string };
  timestamp: string;
}
