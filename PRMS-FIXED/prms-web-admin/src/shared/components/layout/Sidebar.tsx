import React from 'react';
import { NavLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import LocalHospitalOutlinedIcon from '@mui/icons-material/LocalHospitalOutlined';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import SwapHorizOutlinedIcon from '@mui/icons-material/SwapHorizOutlined';
import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined';
import { usePermissions } from '@/shared/hooks/usePermissions';
import { ROUTES } from '@/shared/constants/routes.constants';

interface NavItem {
  label: string;
  to: string;
  icon: React.ReactNode;
}

export const Sidebar: React.FC = () => {
  const { user, isSystemAdmin, isHospitalAdmin } = usePermissions();
  const isClinicalUser = user?.role === 'Clinician' || user?.role === 'Receptionist' || isHospitalAdmin || isSystemAdmin;
  const canViewReports = isSystemAdmin || isHospitalAdmin;

  const navItems: NavItem[] = [
    { label: 'Dashboard', to: ROUTES.DASHBOARD, icon: <DashboardOutlinedIcon fontSize="small" /> },
    ...(isClinicalUser
      ? [
          { label: 'Patients', to: ROUTES.PATIENTS, icon: <PersonOutlineOutlinedIcon fontSize="small" /> },
          { label: 'Referrals', to: ROUTES.REFERRALS, icon: <SwapHorizOutlinedIcon fontSize="small" /> },
        ]
      : []),
    ...(isSystemAdmin
      ? [{ label: 'Hospitals', to: ROUTES.HOSPITALS, icon: <LocalHospitalOutlinedIcon fontSize="small" /> }]
      : []),
    ...(isHospitalAdmin
      ? [{ label: 'Staff', to: ROUTES.USERS, icon: <GroupOutlinedIcon fontSize="small" /> }]
      : []),
    ...(canViewReports
      ? [{ label: 'Reports', to: ROUTES.REPORTS, icon: <AssessmentOutlinedIcon fontSize="small" /> }]
      : []),
    ...(isSystemAdmin
      ? [{ label: 'Audit Logs', to: ROUTES.AUDIT_LOGS, icon: <HistoryOutlinedIcon fontSize="small" /> }]
      : []),
    { label: 'Notifications', to: ROUTES.NOTIFICATIONS, icon: <NotificationsOutlinedIcon fontSize="small" /> },
  ];

  return (
    <Box className="prms-sidebar" component="aside">
      <Box sx={{ px: 3, py: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Typography fontSize="1.5rem" lineHeight={1}>🏥</Typography>
        <Typography color="#fff" fontWeight={700} fontFamily="'Outfit', sans-serif">
          PRMS Kenya
        </Typography>
      </Box>

      <Box component="nav" sx={{ flex: 1, px: 2, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 12px',
              borderRadius: 8,
              color: isActive ? '#fff' : 'rgba(255,255,255,0.65)',
              backgroundColor: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
              textDecoration: 'none',
              fontSize: '0.875rem',
              fontWeight: isActive ? 600 : 500,
              transition: 'background-color 150ms ease, color 150ms ease',
            })}
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </Box>
    </Box>
  );
};
