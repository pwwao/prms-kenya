import React, { type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import { Button } from './Button';

interface EmptyStateProps {
  title: string;
  body?: string;
  action?: { label: string; onClick: () => void };
  icon?: ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ title, body, action, icon }) => (
  <Box display="flex" flexDirection="column" alignItems="center" textAlign="center" py={6} px={3}>
    <Box
      sx={{
        width: 60, height: 60, borderRadius: '50%', bgcolor: 'grey.100',
        display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2,
        color: 'text.disabled',
      }}
    >
      {icon ?? <InboxOutlinedIcon fontSize="medium" />}
    </Box>
    <Typography variant="h6" mb={0.5}>{title}</Typography>
    {body && (
      <Typography variant="body2" color="text.secondary" maxWidth={320} mb={action ? 2.5 : 0}>
        {body}
      </Typography>
    )}
    {action && <Button variant="outline" size="small" onClick={action.onClick}>{action.label}</Button>}
  </Box>
);
