import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '../api/notifications.api';
import type { NotificationListParams } from '@/types/notification.types';

const NOTIFICATIONS_KEY = 'notifications';

export function useNotificationsList(params: NotificationListParams) {
  return useQuery({
    queryKey: [NOTIFICATIONS_KEY, params],
    queryFn: () => notificationsApi.list(params),
    placeholderData: (prev) => prev,
  });
}

/** Lightweight unread-count poll, used for the TopBar bell badge. */
export function useUnreadNotificationsCount() {
  return useQuery({
    queryKey: [NOTIFICATIONS_KEY, 'unread-count'],
    queryFn: async () => {
      const res = await notificationsApi.list({ page: 1, limit: 1, unreadOnly: true });
      return res.meta.pagination?.total ?? 0;
    },
    refetchInterval: 30_000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => notificationsApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_KEY] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_KEY] });
    },
  });
}
