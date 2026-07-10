import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import DoneIcon from '@mui/icons-material/Done';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import ScheduleIcon from '@mui/icons-material/Schedule';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import type { ChatMessage } from '@/types/chat.types';

interface MessageBubbleProps {
  message: ChatMessage;
  isOwnMessage: boolean;
}

function StatusIcon({ status }: { status?: ChatMessage['status'] }) {
  switch (status) {
    case 'sending':
      return <ScheduleIcon sx={{ fontSize: 14, opacity: 0.7 }} />;
    case 'sent':
    case 'delivered':
      return <DoneIcon sx={{ fontSize: 14, opacity: 0.7 }} />;
    case 'read':
      return <DoneAllIcon sx={{ fontSize: 14, color: 'info.light' }} />;
    case 'failed':
      return <ErrorOutlineIcon sx={{ fontSize: 14, color: 'error.light' }} />;
    default:
      return null;
  }
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isOwnMessage }) => (
  <Box display="flex" flexDirection="column" alignItems={isOwnMessage ? 'flex-end' : 'flex-start'} mb={1.25}>
    {!isOwnMessage && (
      <Typography variant="caption" color="text.secondary" ml={1} mb={0.25}>
        {message.sender.fullName} · {message.sender.hospitalName}
      </Typography>
    )}
    <Box
      sx={{
        maxWidth: '70%',
        px: 1.75,
        py: 1,
        borderRadius: 2,
        bgcolor: isOwnMessage ? 'primary.main' : 'grey.100',
        color: isOwnMessage ? 'primary.contrastText' : 'text.primary',
        opacity: message.status === 'failed' ? 0.6 : 1,
      }}
    >
      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {message.content}
      </Typography>
    </Box>
    <Box display="flex" alignItems="center" gap={0.5} mt={0.25} mr={isOwnMessage ? 1 : 0} ml={isOwnMessage ? 0 : 1}>
      <Typography variant="caption" color="text.secondary">
        {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Typography>
      {isOwnMessage && <StatusIcon status={message.status} />}
    </Box>
  </Box>
);
