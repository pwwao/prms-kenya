import type { PaginationParams } from './api.types';

export type Gender = 'Male' | 'Female' | 'Other' | 'Prefer not to say';

export interface Patient {
  id: number;
  nationalId: string | null;
  fullName: string;
  phone: string | null;
  gender: Gender;
  dateOfBirth: string;
  age?: number;
  county: string;
  subCounty: string | null;
  nextOfKinName: string | null;
  nextOfKinPhone: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PatientListParams extends PaginationParams {
  county?: string;
  gender?: Gender;
}

export interface PatientSearchParams {
  nationalId?: string;
  phone?: string;
  q?: string;
}

export interface CreatePatientRequest {
  nationalId?: string | null;
  fullName: string;
  phone?: string | null;
  gender: Gender;
  dateOfBirth: string;
  county: string;
  subCounty?: string | null;
  nextOfKinName?: string | null;
  nextOfKinPhone?: string | null;
}

export type UpdatePatientRequest = Partial<Omit<CreatePatientRequest, 'nationalId'>>;

/** Row returned by GET /patients/:patientId/referral-history */
export interface PatientReferralHistoryEntry {
  id: number;
  referralCode: string;
  status: string;
  urgencyLevel: string;
  sourceHospitalName: string;
  destinationHospitalName: string;
  createdAt: string;
}
