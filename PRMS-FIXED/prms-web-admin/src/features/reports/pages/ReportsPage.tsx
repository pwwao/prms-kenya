import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import CircularProgress from '@mui/material/CircularProgress';
import Tooltip from '@mui/material/Tooltip';
import { PageHeader, Button } from '@/shared/components/ui';
import { ReferralTrendsChart } from '../components/ReferralTrendsChart';
import { CountyReportChart } from '../components/CountyReportChart';
import { FacilityPerformanceTable } from '../components/FacilityPerformanceTable';
import { reportsApi } from '../api/reports.api';

function formatDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

const TAB_REPORT_TYPES = [
  'county',
  'referral-trends',
  'facility-performance',
] as const;

const ReportsPage: React.FC = () => {
  const [tab, setTab] = useState(0);
  const [startDate, setStartDate] = useState(formatDate(new Date(Date.now() - 30 * 86400000)));
  const [endDate, setEndDate] = useState(formatDate(new Date()));
  const [downloading, setDownloading] = useState(false);

  const range = { startDate, endDate };

  const trendsQuery = useQuery({
    queryKey: ['reports', 'trends', range],
    queryFn: () => reportsApi.getReferralTrends({ ...range, groupBy: 'day' }),
  });

  const countyQuery = useQuery({
    queryKey: ['reports', 'county', range],
    queryFn: () => reportsApi.getCountyReport(range),
  });

  const performanceQuery = useQuery({
    queryKey: ['reports', 'performance', range],
    queryFn: () => reportsApi.getFacilityPerformance(range),
  });

  // BUG FIX: PDF download handler — calls the new /reports/export-pdf endpoint
  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      await reportsApi.exportPdf({
        ...range,
        reportType: TAB_REPORT_TYPES[tab],
        groupBy: 'day',
      });
    } catch (err) {
      console.error('[ReportsPage] PDF export failed:', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle="Anonymized referral analytics — no patient data included"
        actions={
          <Box display="flex" gap={1.5} alignItems="center">
            <TextField
              size="small" type="date" label="From"
              value={startDate} onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              size="small" type="date" label="To"
              value={endDate} onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            {/* BUG FIX: PDF download button — was missing entirely */}
            <Tooltip title="Download current report as PDF">
              <span>
                <Button
                  variant="outline"
                  onClick={handleDownloadPdf}
                  disabled={downloading}
                  aria-label="Download PDF"
                >
                  {downloading ? (
                    <CircularProgress size={16} sx={{ mr: 0.5 }} />
                  ) : null}
                  {downloading ? 'Generating…' : 'Download PDF'}
                </Button>
              </span>
            </Tooltip>
          </Box>
        }
      />

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="Trends" />
        <Tab label="County Breakdown" />
        <Tab label="Facility Performance" />
      </Tabs>

      {tab === 0 && (
        <ReferralTrendsChart data={trendsQuery.data ?? []} loading={trendsQuery.isLoading} />
      )}

      {tab === 1 && (
        <CountyReportChart data={countyQuery.data ?? []} loading={countyQuery.isLoading} />
      )}

      {tab === 2 && (
        <FacilityPerformanceTable data={performanceQuery.data ?? []} loading={performanceQuery.isLoading} />
      )}
    </>
  );
};

export default ReportsPage;
