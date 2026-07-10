import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/components/ui';
import { ROUTES } from '@/shared/constants/routes.constants';

const UnauthorizedPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <Box minHeight="100vh" display="flex" flexDirection="column" alignItems="center" justifyContent="center" gap={2} px={3} textAlign="center">
      <Typography fontSize="3rem">🔒</Typography>
      <Typography variant="h4">Access Denied</Typography>
      <Typography variant="body2" color="text.secondary" maxWidth={420}>
        Your account role doesn't have permission to view this page. If you believe this is a mistake, contact your System Administrator.
      </Typography>
      <Button variant="primary" onClick={() => navigate(ROUTES.DASHBOARD)}>Back to Dashboard</Button>
    </Box>
  );
};

export default UnauthorizedPage;
