import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Button from '@mui/material/Button';
import DownloadIcon from '@mui/icons-material/Download';
import { PageHeader, DataTable, PaginationBar, type Column } from '@/shared/components/ui';
import { AuditLogFilters } from '../components/AuditLogFilters';
import { AuditLogDetailDrawer } from '../components/AuditLogDetailDrawer';
import { auditApi } from '../api/audit.api';
import { usePagination } from '@/shared/hooks/usePagination';
import { useDebounce } from '@/shared/hooks/useDebounce';
import type { AuditLog } from '@/types/audit.types';

function formatDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

const AuditLogPage: React.FC = () => {
  const { page, limit, setPage, onLimitChange } = usePagination(50);
  const [actionType, setActionType] = useState('');
  const [ip, setIp] = useState('');
  const [startDate, setStartDate] = useState(formatDate(new Date(Date.now() - 7 * 86400000)));
  const [endDate, setEndDate] = useState(formatDate(new Date()));
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const debouncedAction = useDebounce(actionType);
  const debouncedIp = useDebounce(ip);

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', { page, limit, debouncedAction, debouncedIp, startDate, endDate }],
    queryFn: () =>
      auditApi.list({
        page, limit,
        actionType: debouncedAction || undefined,
        ip: debouncedIp || undefined,
        startDate: startDate ? `${startDate}T00:00:00.000Z` : undefined,
        endDate: endDate ? `${endDate}T23:59:59.999Z` : undefined,
      }),
  });

  const columns: Column<AuditLog>[] = [
    { key: 'timestamp', label: 'Timestamp', render: (v) => new Date(v as string).toLocaleString() },
    { key: 'user', label: 'User', render: (v) => (v ? `${(v as AuditLog['user'])!.username}` : 'System') },
    { key: 'actionType', label: 'Action', render: (v) => <span className="text-code">{String(v)}</span> },
    { key: 'resourceAffected', label: 'Resource' },
    { key: 'ipAddress', label: 'IP Address' },
  ];

  return (
    <>
      <PageHeader
        title="Audit Logs"
        subtitle="Immutable system-wide activity trail"
        actions={<Button startIcon={<DownloadIcon />} variant="outlined" size="small">Export CSV</Button>}
      />

      <AuditLogFilters
        actionType={actionType} onActionTypeChange={(v) => { setActionType(v); setPage(1); }}
        ip={ip} onIpChange={(v) => { setIp(v); setPage(1); }}
        startDate={startDate} onStartDateChange={(v) => { setStartDate(v); setPage(1); }}
        endDate={endDate} onEndDateChange={(v) => { setEndDate(v); setPage(1); }}
      />

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        loading={isLoading}
        onRowClick={setSelectedLog}
        emptyTitle="No events match your filters"
        emptyBody="Try widening the date range or clearing filters."
      />

      {data?.meta.pagination && (
        <PaginationBar meta={data.meta.pagination} onPageChange={setPage} onLimitChange={onLimitChange} />
      )}

      <AuditLogDetailDrawer log={selectedLog} onClose={() => setSelectedLog(null)} />
    </>
  );
};

export default AuditLogPage;
