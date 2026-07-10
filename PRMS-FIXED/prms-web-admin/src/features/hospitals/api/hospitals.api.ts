/**
 * Hospitals API — maps to PRMS_API_Reference_v1.0.md "MODULE 2 — HOSPITALS"
 */

import { apiClient } from '@/shared/api/api-client';
import type { ApiSuccess, ApiSuccessPaginated } from '@/types/api.types';
import type {
  Hospital,
  HospitalListParams,
  UpdateHospitalStatusRequest,
} from '@/types/hospital.types';

export const hospitalsApi = {
  list: async (params: HospitalListParams) => {
    const { data } = await apiClient.get<ApiSuccessPaginated<Hospital>>('/hospitals', { params });
    return data;
  },

  getById: async (hospitalId: number) => {
    const { data } = await apiClient.get<ApiSuccess<Hospital>>(`/hospitals/${hospitalId}`);
    return data.data;
  },

  updateStatus: async (hospitalId: number, payload: UpdateHospitalStatusRequest) => {
    const { data } = await apiClient.patch<ApiSuccess<Hospital>>(
      `/hospitals/${hospitalId}/status`,
      payload
    );
    return data.data;
  },
};
