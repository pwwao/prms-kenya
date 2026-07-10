import React from 'react';
import { usePermissions } from '@/shared/hooks/usePermissions';
import SystemAdminDashboardPage from './SystemAdminDashboardPage';
import HospitalAdminDashboardPage from './HospitalAdminDashboardPage';
import StaffDashboardPage from './StaffDashboardPage';

/** Renders the correct dashboard based on the authenticated user's role. */
const DashboardRouter: React.FC = () => {
  const { isSystemAdmin, isHospitalAdmin } = usePermissions();
  if (isSystemAdmin) return <SystemAdminDashboardPage />;
  if (isHospitalAdmin) return <HospitalAdminDashboardPage />;
  return <StaffDashboardPage />;
};

export default DashboardRouter;
