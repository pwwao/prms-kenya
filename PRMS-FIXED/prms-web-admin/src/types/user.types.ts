import type { UserRole, UserStatus } from './auth.types';

export interface StaffMember {
  id: number;
  username: string;
  fullName: string;
  email: string | null;
  phoneNumber: string | null;
  role: Extract<UserRole, 'Clinician' | 'Receptionist'>;
  status: UserStatus;
  isTwoFactorEnabled: boolean;
  isFirstLogin?: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface StaffListParams {
  status?: UserStatus;
  role?: Extract<UserRole, 'Clinician' | 'Receptionist'>;
  q?: string;
  page?: number;
  limit?: number;
}

export interface CreateStaffRequest {
  hospitalId?: number | null;
  fullName: string;
  username: string;
  email?: string | null;
  phoneNumber?: string | null;
  role: Extract<UserRole, 'Clinician' | 'Receptionist'>;
  password: string;
}

export interface UpdateStaffRequest {
  fullName?: string;
  phoneNumber?: string | null;
  email?: string | null;
}

export interface UpdateStaffStatusRequest {
  status: Extract<UserStatus, 'Active' | 'Suspended'>;
  reason?: string;
}
