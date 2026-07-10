import React from 'react';
import LinearProgress from '@mui/material/LinearProgress';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { DataTable, type Column } from '@/shared/components/ui';
import type { FacilityPerformanceRow } from '@/types/report.types';

interface FacilityPerformanceTableProps {
  data: FacilityPerformanceRow[];
  loading?: boolean;
}

function RateBar({ value, color }: { value: number; color: string }) {
  return (
    <Box display="flex" alignItems="center" gap={1} minWidth={120}>
      <LinearProgress
        variant="determinate"
        value={value}
        sx={{ flex: 1, height: 6, borderRadius: 3, bgcolor: 'grey.100', '& .MuiLinearProgress-bar': { bgcolor: color } }}
      />
      <Typography variant="caption" fontWeight={600} minWidth={36}>{value.toFixed(0)}%</Typography>
    </Box>
  );
}

export const FacilityPerformanceTable: React.FC<FacilityPerformanceTableProps> = ({ data, loading }) => {
  const rows = data.map((d) => ({ ...d, id: d.hospitalId }));

  const columns: Column<typeof rows[number]>[] = [
    { key: 'hospitalName', label: 'Facility' },
    { key: 'county', label: 'County' },
    { key: 'referralsSent', label: 'Sent', align: 'right' },
    { key: 'referralsReceived', label: 'Received', align: 'right' },
    {
      key: 'acceptanceRate', label: 'Acceptance Rate',
      render: (v) => <RateBar value={v as number} color="#16834B" />,
    },
    {
      key: 'completionRate', label: 'Completion Rate',
      render: (v) => <RateBar value={v as number} color="#0B6B5D" />,
    },
    {
      key: 'averageResponseTimeHours', label: 'Avg Response',
      render: (v) => `${(v as number).toFixed(1)}h`,
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={rows}
      loading={loading}
      emptyTitle="No performance data for this period"
    />
  );
};
