import React from 'react';
import { useNavigate } from 'react-router-dom';
import List from '@mui/material/List';
import Paper from '@mui/material/Paper';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import { PageHeader, Button, EmptyState, PaginationBar } from '@/shared/components/ui';
import { NotificationCard } from '../components/NotificationCard';
import {
  useNotificationsList,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '../hooks/useNotifications';
import { usePagination } from '@/shared/hooks/usePagination';
import { ROUTES } from '@/shared/constants/routes.constants';
import type { AppNotification } from '@/types/notification.types';

const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { page, limit, setPage, onLimitChange } = usePagination(20);
  const { data, isLoading } = useNotificationsList({ page, limit });
  const markReadMutation = useMarkNotificationRead();
  const markAllReadMutation = useMarkAllNotificationsRead();

  const notifications = data?.data ?? [];
  const hasUnread = notifications.some((n) => !n.isRead);

  const handleClick = (notification: AppNotification) => {
    if (!notification.isRead) {
      markReadMutation.mutate(notification.id);
    }
    if (notification.data.referralId) {
      navigate(ROUTES.REFERRAL_DETAIL(notification.data.referralId));
    }
  };

  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle="Referral and system activity relevant to you"
        actions={
          hasUnread ? (
            <Button variant="outline" size="small" onClick={() => markAllReadMutation.mutate()}>
              Mark all as read
            </Button>
          ) : undefined
        }
      />

      <Paper variant="outlined">
        {isLoading ? (
          <Box display="flex" justifyContent="center" py={6}>
            <CircularProgress size={28} />
          </Box>
        ) : notifications.length === 0 ? (
          <EmptyState title="No notifications yet" body="You're all caught up." />
        ) : (
          <>
            <List disablePadding>
              {notifications.map((notification) => (
                <NotificationCard
                  key={notification.id}
                  notification={notification}
                  onClick={() => handleClick(notification)}
                />
              ))}
            </List>
            {data?.meta.pagination && (
              <PaginationBar meta={data.meta.pagination} onPageChange={setPage} onLimitChange={onLimitChange} />
            )}
          </>
        )}
      </Paper>
    </>
  );
};

export default NotificationsPage;
