import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import Grid from '@mui/material/Grid';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import SwapHorizOutlinedIcon from '@mui/icons-material/SwapHorizOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HourglassEmptyOutlinedIcon from '@mui/icons-material/HourglassEmptyOutlined';
import { PageHeader, KPICard } from '@/shared/components/ui';
import { CountyReportChart } from '@/features/reports/components/CountyReportChart';
import { usersApi } from '@/features/users/api/users.api';
import { reportsApi } from '@/features/reports/api/reports.api';
import { ROUTES } from '@/shared/constants/routes.constants';

function formatDate(d: Date) { return d.toISOString().slice(0, 10); }

/** Hospital Admin landing page — see User Flow HA-03 */
const HospitalAdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const staffQuery = useQuery({
    queryKey: ['staff', 'active-count'],
    queryFn: () => usersApi.list({ status: 'Active', limit: 1 }),
  });

  const range = {
    startDate: formatDate(new Date(Date.now() - 30 * 86400000)),
    endDate: formatDate(new Date()),
  };

  const countyQuery = useQuery({
    queryKey: ['reports', 'dashboard-county'],
    queryFn: () => reportsApi.getCountyReport(range),
  });

  const ownCounty = countyQuery.data?.[0];

  return (
    <>
      <PageHeader title="Facility Dashboard" subtitle="Your hospital's referral activity, last 30 days" />

      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} lg={3}>
          <KPICard
            title="Active Staff"
            value={staffQuery.data?.meta.pagination.total ?? '—'}
            accent="teal"
            icon={<GroupOutlinedIcon />}
            onClick={() => navigate(ROUTES.USERS)}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <KPICard
            title="Total Referrals"
            value={ownCounty?.totalReferrals ?? '—'}
            accent="info"
            icon={<SwapHorizOutlinedIcon />}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <KPICard
            title="Accepted"
            value={ownCounty?.accepted ?? '—'}
            accent="success"
            icon={<CheckCircleOutlineIcon />}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <KPICard
            title="Avg Response Time"
            value={ownCounty ? `${ownCounty.averageResponseTimeHours.toFixed(1)}h` : '—'}
            accent="amber"
            icon={<HourglassEmptyOutlinedIcon />}
          />
        </Grid>
      </Grid>

      <CountyReportChart data={countyQuery.data ?? []} loading={countyQuery.isLoading} />
    </>
  );
};

export default HospitalAdminDashboardPage;
