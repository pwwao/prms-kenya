/**
 * Notifications API — maps to PRMS_API_Reference_v1.0.md §7
 */

import { apiClient } from '@/shared/api/api-client';
import type { ApiSuccess, ApiSuccessPaginated } from '@/types/api.types';
import type { AppNotification, NotificationListParams } from '@/types/notification.types';

export const notificationsApi = {
  list: async (params: NotificationListParams) => {
    const { data } = await apiClient.get<ApiSuccessPaginated<AppNotification>>('/notifications', { params });
    return data;
  },

  markRead: async (id: number) => {
    await apiClient.patch(`/notifications/${id}/read`);
  },

  markAllRead: async () => {
    const { data } = await apiClient.patch<ApiSuccess<{ markedCount: number }>>('/notifications/read-all');
    return data.data;
  },
};
