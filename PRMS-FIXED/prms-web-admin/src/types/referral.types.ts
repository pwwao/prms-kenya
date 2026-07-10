import type { PaginationParams } from './api.types';
import type { UserRole } from './auth.types';
import type { Gender } from './patient.types';

export type ReferralStatus =
  | 'Draft'
  | 'Dispatched'
  | 'Received'
  | 'Accepted'
  | 'Rejected'
  | 'Completed';

export type UrgencyLevel = 'Routine' | 'Urgent' | 'Emergent';
export type HospitalRoleFilter = 'source' | 'destination' | 'any';

export interface ReferralPatientSummary {
  id: number;
  displayName: string;
  gender: Gender;
  age: number;
}

export interface ReferralHospitalSummary {
  id: number;
  name: string;
  facilityLevel: string;
  county?: string;
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

export interface ReferralAttachment {
  id: number;
  fileName: string;
  fileUrl: string;
  fileSizeBytes: number;
  uploadedAt: string;
}

export interface Referral {
  id: number;
  referralCode: string;
  status: ReferralStatus;
  urgencyLevel: UrgencyLevel;
  reasonForReferral: string;
  clinicalSummary: string | null;
  rejectionReason: string | null;
  patient: ReferralPatientSummary;
  sourceHospital: ReferralHospitalSummary;
  destinationHospital: ReferralHospitalSummary;
  createdByUser?: ReferralCreatedBy;
  createdAt: string;
  updatedAt: string;
}

export interface ReferralListParams extends PaginationParams {
  status?: ReferralStatus;
  urgencyLevel?: UrgencyLevel;
  patientId?: number;
  hospitalRole?: HospitalRoleFilter;
}

export interface CreateReferralRequest {
  patientId: number;
  destinationHospitalId: number;
  urgencyLevel: UrgencyLevel;
  clinicalSummary?: string | null;
  reasonForReferral: string;
}

export interface UpdateReferralRequest {
  urgencyLevel?: UrgencyLevel;
  clinicalSummary?: string | null;
  reasonForReferral?: string;
  destinationHospitalId?: number;
}

export interface TransitionReferralRequest {
  status: ReferralStatus;
  rejectionReason?: string | null;
  notes?: string | null;
}
