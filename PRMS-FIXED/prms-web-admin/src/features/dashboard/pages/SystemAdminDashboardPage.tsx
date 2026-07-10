import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import Grid from '@mui/material/Grid';
import LocalHospitalOutlinedIcon from '@mui/icons-material/LocalHospitalOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import SwapHorizOutlinedIcon from '@mui/icons-material/SwapHorizOutlined';
import { PageHeader, KPICard, DataTable, StatusBadge, type Column } from '@/shared/components/ui';
import { ReferralTrendsChart } from '@/features/reports/components/ReferralTrendsChart';
import { hospitalsApi } from '@/features/hospitals/api/hospitals.api';
import { reportsApi } from '@/features/reports/api/reports.api';
import { ROUTES } from '@/shared/constants/routes.constants';
import type { Hospital } from '@/types/hospital.types';

function formatDate(d: Date) { return d.toISOString().slice(0, 10); }

/** System Admin landing page — see User Flow SA-02 and Architecture Contract §3.3 */
const SystemAdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const pendingQuery = useQuery({
    queryKey: ['hospitals', 'pending-preview'],
    queryFn: () => hospitalsApi.list({ status: 'Pending', limit: 5, sortBy: 'created_at', sortDir: 'desc' }),
  });

  const approvedQuery = useQuery({
    queryKey: ['hospitals', 'approved-count'],
    queryFn: () => hospitalsApi.list({ status: 'Approved', limit: 1 }),
  });

  const trendsQuery = useQuery({
    queryKey: ['reports', 'dashboard-trends'],
    queryFn: () => reportsApi.getReferralTrends({
      startDate: formatDate(new Date(Date.now() - 30 * 86400000)),
      endDate: formatDate(new Date()),
      groupBy: 'day',
    }),
  });

  const totalReferrals30d = (trendsQuery.data ?? []).reduce((sum, r) => sum + r.total, 0);

  const columns: Column<Hospital>[] = [
    { key: 'name', label: 'Hospital Name' },
    { key: 'county', label: 'County' },
    { key: 'facilityLevel', label: 'Level' },
    { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v as Hospital['status']} /> },
  ];

  return (
    <>
      <PageHeader title="System Dashboard" subtitle="Platform-wide overview" />

      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} lg={3}>
          <KPICard
            title="Pending Approvals"
            value={pendingQuery.data?.meta.pagination.total ?? '—'}
            accent="amber"
            icon={<WarningAmberOutlinedIcon />}
            onClick={() => navigate(`${ROUTES.HOSPITALS}?status=Pending`)}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <KPICard
            title="Active Hospitals"
            value={approvedQuery.data?.meta.pagination.total ?? '—'}
            accent="teal"
            icon={<LocalHospitalOutlinedIcon />}
            onClick={() => navigate(`${ROUTES.HOSPITALS}?status=Approved`)}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <KPICard title="Security Alerts" value={0} accent="danger" icon={<CheckCircleOutlineIcon />} />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <KPICard
            title="Total Referrals (30d)"
            value={totalReferrals30d.toLocaleString()}
            accent="info"
            icon={<SwapHorizOutlinedIcon />}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={7}>
          <ReferralTrendsChart data={trendsQuery.data ?? []} loading={trendsQuery.isLoading} />
        </Grid>
        <Grid item xs={12} lg={5}>
          <PageHeader title="Pending Applications" subtitle="" actions={null} />
          <DataTable
            columns={columns}
            data={pendingQuery.data?.data ?? []}
            loading={pendingQuery.isLoading}
            onRowClick={(row) => navigate(ROUTES.HOSPITAL_DETAIL(row.id))}
            emptyTitle="No pending applications"
            emptyBody="All caught up!"
          />
        </Grid>
      </Grid>
    </>
  );
};

export default SystemAdminDashboardPage;
