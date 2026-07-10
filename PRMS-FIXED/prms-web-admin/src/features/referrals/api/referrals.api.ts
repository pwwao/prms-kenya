/**
 * Referrals API — maps to PRMS_API_Reference_v1.0.md "MODULE 4/5/6 — REFERRALS"
 */

import { apiClient } from '@/shared/api/api-client';
import type { ApiSuccess, ApiSuccessPaginated } from '@/types/api.types';
import type {
  Referral,
  ReferralListParams,
  CreateReferralRequest,
  UpdateReferralRequest,
  TransitionReferralRequest,
  ReferralTimelineEntry,
  ReferralAttachment,
} from '@/types/referral.types';

export const referralsApi = {
  list: async (params: ReferralListParams) => {
    const { data } = await apiClient.get<ApiSuccessPaginated<Referral>>('/referrals', { params });
    return data;
  },

  getById: async (referralId: number) => {
    const { data } = await apiClient.get<ApiSuccess<Referral>>(`/referrals/${referralId}`);
    return data.data;
  },

  getByCode: async (code: string) => {
    const { data } = await apiClient.get<ApiSuccess<Referral>>(`/referrals/code/${code}`);
    return data.data;
  },

  create: async (payload: CreateReferralRequest) => {
    const { data } = await apiClient.post<ApiSuccess<Referral>>('/referrals', payload);
    return data.data;
  },

  update: async (referralId: number, payload: UpdateReferralRequest) => {
    const { data } = await apiClient.patch<ApiSuccess<Referral>>(`/referrals/${referralId}`, payload);
    return data.data;
  },

  transition: async (referralId: number, payload: TransitionReferralRequest) => {
    const { data } = await apiClient.patch<ApiSuccess<Referral>>(`/referrals/${referralId}/status`, payload);
    return data.data;
  },

  remove: async (referralId: number) => {
    await apiClient.delete(`/referrals/${referralId}`);
  },

  timeline: async (referralId: number) => {
    const { data } = await apiClient.get<ApiSuccess<ReferralTimelineEntry[]>>(`/referrals/${referralId}/timeline`);
    return data.data;
  },

  attachments: async (referralId: number) => {
    const { data } = await apiClient.get<ApiSuccess<ReferralAttachment[]>>(`/referrals/${referralId}/attachments`);
    return data.data;
  },

  removeAttachment: async (referralId: number, attachmentId: number) => {
    await apiClient.delete(`/referrals/${referralId}/attachments/${attachmentId}`);
  },
};
