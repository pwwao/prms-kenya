import React from 'react';
import { useNavigate } from 'react-router-dom';
import IconButton from '@mui/material/IconButton';
import Badge from '@mui/material/Badge';
import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined';
import { useUnreadNotificationsCount } from '../hooks/useNotifications';
import { ROUTES } from '@/shared/constants/routes.constants';

export const NotificationBell: React.FC = () => {
  const navigate = useNavigate();
  const { data: unreadCount = 0 } = useUnreadNotificationsCount();

  return (
    <IconButton onClick={() => navigate(ROUTES.NOTIFICATIONS)} aria-label="Notifications">
      <Badge badgeContent={unreadCount} color="error" max={99}>
        <NotificationsOutlinedIcon />
      </Badge>
    </IconButton>
  );
};
