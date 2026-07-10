/**
 * useNotificationBadge — unread notification count for tab badge
 */
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { notificationsApi } from '@api/services';
import { queryKeys } from '@api/queryClient';
import type { RootState } from '@store/index';

export function useNotificationBadge() {
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  const isOnline = useSelector((s: RootState) => s.connectivity.isOnline);

  const { data } = useQuery({
    queryKey: queryKeys.notifications.unread(),
    queryFn: async () => {
      const res = await notificationsApi.list({ isRead: false, limit: 1 });
      return res.data.meta.pagination?.total ?? 0;
    },
    enabled: isAuthenticated && isOnline,
    refetchInterval: 60_000, // poll every minute as fallback to Socket.IO
    staleTime: 30_000,
  });

  return { unreadCount: data ?? 0 };
}
