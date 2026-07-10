/**
 * Users (Staff) API — maps to PRMS_API_Reference_v1.0.md "MODULE 3 — USERS"
 */

import { apiClient } from '@/shared/api/api-client';
import type { ApiSuccess, ApiSuccessPaginated } from '@/types/api.types';
import type {
  StaffMember,
  StaffListParams,
  CreateStaffRequest,
  UpdateStaffRequest,
  UpdateStaffStatusRequest,
} from '@/types/user.types';

export const usersApi = {
  list: async (params: StaffListParams) => {
    const { data } = await apiClient.get<ApiSuccessPaginated<StaffMember>>('/users', { params });
    return data;
  },

  getById: async (userId: number) => {
    const { data } = await apiClient.get<ApiSuccess<StaffMember>>(`/users/${userId}`);
    return data.data;
  },

  create: async (payload: CreateStaffRequest) => {
    const { data } = await apiClient.post<ApiSuccess<StaffMember>>('/users', payload);
    return data.data;
  },

  update: async (userId: number, payload: UpdateStaffRequest) => {
    const { data } = await apiClient.patch<ApiSuccess<StaffMember>>(`/users/${userId}`, payload);
    return data.data;
  },

  updateStatus: async (userId: number, payload: UpdateStaffStatusRequest) => {
    const { data } = await apiClient.patch<ApiSuccess<StaffMember>>(
      `/users/${userId}/status`,
      payload
    );
    return data.data;
  },
};
