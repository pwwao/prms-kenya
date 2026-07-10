import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Divider from '@mui/material/Divider';
import { useNavigate } from 'react-router-dom';
import { usePermissions } from '@/shared/hooks/usePermissions';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { NotificationBell } from '@/features/notifications/components/NotificationBell';
import { ROUTES } from '@/shared/constants/routes.constants';

export const TopBar: React.FC = () => {
  const { user } = usePermissions();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const initials = user?.fullName
    ?.split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <Box className="prms-topbar">
      <Box flex={1} />
      <NotificationBell />
      <Box
        display="flex"
        alignItems="center"
        gap={1.5}
        sx={{ cursor: 'pointer' }}
        onClick={(e) => setAnchorEl(e.currentTarget)}
      >
        <Box textAlign="right" display={{ xs: 'none', sm: 'block' }}>
          <Typography variant="body2" fontWeight={600} lineHeight={1.2}>
            {user?.fullName ?? 'User'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {user?.role}
          </Typography>
        </Box>
        <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36, fontSize: '0.8125rem' }}>
          {initials}
        </Avatar>
      </Box>

      <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={() => setAnchorEl(null)}>
        <MenuItem disabled>{user?.hospitalName ?? 'PRMS System'}</MenuItem>
        <Divider />
        <MenuItem onClick={() => { setAnchorEl(null); navigate(ROUTES.PROFILE); }}>My Profile</MenuItem>
        <MenuItem onClick={logout}>Log out</MenuItem>
      </Menu>
    </Box>
  );
};
