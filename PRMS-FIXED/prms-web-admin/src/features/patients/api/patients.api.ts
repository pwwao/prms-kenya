/**
 * Patients API — maps to PRMS_API_Reference_v1.0.md "MODULE 3 — PATIENTS"
 */

import { apiClient } from '@/shared/api/api-client';
import type { ApiSuccess, ApiSuccessPaginated } from '@/types/api.types';
import type {
  Patient,
  PatientListParams,
  PatientSearchParams,
  CreatePatientRequest,
  UpdatePatientRequest,
  PatientReferralHistoryEntry,
} from '@/types/patient.types';

export const patientsApi = {
  list: async (params: PatientListParams) => {
    const { data } = await apiClient.get<ApiSuccessPaginated<Patient>>('/patients', { params });
    return data;
  },

  search: async (params: PatientSearchParams) => {
    const { data } = await apiClient.get<ApiSuccess<Patient[]>>('/patients/search', { params });
    return data.data;
  },

  getById: async (patientId: number) => {
    const { data } = await apiClient.get<ApiSuccess<Patient>>(`/patients/${patientId}`);
    return data.data;
  },

  create: async (payload: CreatePatientRequest) => {
    const { data } = await apiClient.post<ApiSuccess<Patient>>('/patients', payload);
    return data.data;
  },

  update: async (patientId: number, payload: UpdatePatientRequest) => {
    const { data } = await apiClient.patch<ApiSuccess<Patient>>(`/patients/${patientId}`, payload);
    return data.data;
  },

  referralHistory: async (patientId: number) => {
    const { data } = await apiClient.get<ApiSuccess<PatientReferralHistoryEntry[]>>(
      `/patients/${patientId}/referral-history`
    );
    return data.data;
  },
};
