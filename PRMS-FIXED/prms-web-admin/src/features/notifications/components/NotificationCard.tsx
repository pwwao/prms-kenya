import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import ListItemButton from '@mui/material/ListItemButton';
import CircleIcon from '@mui/icons-material/Circle';
import SwapHorizOutlinedIcon from '@mui/icons-material/SwapHorizOutlined';
import ChatBubbleOutlineOutlinedIcon from '@mui/icons-material/ChatBubbleOutlineOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HighlightOffOutlinedIcon from '@mui/icons-material/HighlightOffOutlined';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import type { AppNotification, NotificationType } from '@/types/notification.types';

const ICONS: Record<NotificationType, React.ReactNode> = {
  REFERRAL_DISPATCHED: <SwapHorizOutlinedIcon fontSize="small" />,
  REFERRAL_RECEIVED: <SwapHorizOutlinedIcon fontSize="small" />,
  REFERRAL_ACCEPTED: <CheckCircleOutlineIcon fontSize="small" color="success" />,
  REFERRAL_REJECTED: <HighlightOffOutlinedIcon fontSize="small" color="error" />,
  REFERRAL_COMPLETED: <CheckCircleOutlineIcon fontSize="small" color="success" />,
  MESSAGE_RECEIVED: <ChatBubbleOutlineOutlinedIcon fontSize="small" />,
  HOSPITAL_APPROVED: <BusinessOutlinedIcon fontSize="small" color="success" />,
  HOSPITAL_SUSPENDED: <BusinessOutlinedIcon fontSize="small" color="error" />,
};

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

interface NotificationCardProps {
  notification: AppNotification;
  onClick: () => void;
}

export const NotificationCard: React.FC<NotificationCardProps> = ({ notification, onClick }) => (
  <ListItemButton
    onClick={onClick}
    sx={{
      alignItems: 'flex-start',
      gap: 1.5,
      py: 1.5,
      borderBottom: '1px solid',
      borderColor: 'divider',
      bgcolor: notification.isRead ? 'transparent' : 'action.hover',
    }}
  >
    <Box mt={0.25} color="text.secondary">
      {ICONS[notification.type] ?? <CircleIcon fontSize="small" />}
    </Box>
    <Box flex={1} minWidth={0}>
      <Typography variant="body2" fontWeight={notification.isRead ? 400 : 700}>
        {notification.title}
      </Typography>
      <Typography variant="body2" color="text.secondary" mt={0.25}>
        {notification.body}
      </Typography>
      <Typography variant="caption" color="text.disabled" mt={0.5} display="block">
        {timeAgo(notification.createdAt)}
      </Typography>
    </Box>
    {!notification.isRead && (
      <CircleIcon sx={{ fontSize: 8, color: 'primary.main', mt: 0.75 }} />
    )}
  </ListItemButton>
);
