/**
 * Chat API — maps to PRMS_API_Reference_v1.0.md §6
 * `GET /api/v1/referrals/:referralId/messages`
 */

import { apiClient } from '@/shared/api/api-client';
import type { ApiSuccessPaginated } from '@/types/api.types';
import type { ChatMessage } from '@/types/chat.types';

export const chatApi = {
  getHistory: async (referralId: number, params: { page?: number; limit?: number } = {}) => {
    const { data } = await apiClient.get<ApiSuccessPaginated<ChatMessage>>(
      `/referrals/${referralId}/messages`,
      { params },
    );
    return data;
  },
};
