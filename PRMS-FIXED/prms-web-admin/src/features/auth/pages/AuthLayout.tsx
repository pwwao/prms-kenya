import React, { type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ title, subtitle, children }) => (
  <Box
    minHeight="100vh"
    display="flex"
    alignItems="center"
    justifyContent="center"
    sx={{ bgcolor: 'background.default', px: 2 }}
  >
    <Paper variant="outlined" sx={{ width: '100%', maxWidth: 420, p: 4, borderRadius: 3 }}>
      <Box textAlign="center" mb={3}>
        <Typography fontSize="2rem" mb={1}>🏥</Typography>
        <Typography variant="h4" mb={subtitle ? 0.5 : 0}>{title}</Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary">{subtitle}</Typography>
        )}
      </Box>
      {children}
    </Paper>
  </Box>
);
