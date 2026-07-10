import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/components/ui';
import { ROUTES } from '@/shared/constants/routes.constants';

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <Box minHeight="100vh" display="flex" flexDirection="column" alignItems="center" justifyContent="center" gap={2} px={3} textAlign="center">
      <Typography fontSize="3rem">🧭</Typography>
      <Typography variant="h4">Page Not Found</Typography>
      <Typography variant="body2" color="text.secondary" maxWidth={420}>
        The page you're looking for doesn't exist or may have been moved.
      </Typography>
      <Button variant="primary" onClick={() => navigate(ROUTES.DASHBOARD)}>Back to Dashboard</Button>
    </Box>
  );
};

export default NotFoundPage;
