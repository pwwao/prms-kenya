import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader, DataTable, PaginationBar, Button, type Column } from '@/shared/components/ui';
import { ReferralFilters } from '../components/ReferralFilters';
import { ReferralStatusBadge, UrgencyBadge } from '../components/ReferralStatusBadge';
import { useReferralsList } from '../hooks/useReferrals';
import { usePagination } from '@/shared/hooks/usePagination';
import { ROUTES } from '@/shared/constants/routes.constants';
import type { Referral, ReferralStatus, UrgencyLevel, HospitalRoleFilter } from '@/types/referral.types';

const ReferralListPage: React.FC = () => {
  const navigate = useNavigate();
  const { page, limit, setPage, onLimitChange } = usePagination(20);
  const [status, setStatus] = useState<ReferralStatus | ''>('');
  const [urgencyLevel, setUrgencyLevel] = useState<UrgencyLevel | ''>('');
  const [hospitalRole, setHospitalRole] = useState<HospitalRoleFilter>('any');

  const { data, isLoading } = useReferralsList({
    page, limit,
    status: status || undefined,
    urgencyLevel: urgencyLevel || undefined,
    hospitalRole,
    sortBy: 'created_at',
    sortDir: 'desc',
  });

  const columns: Column<Referral>[] = [
    { key: 'referralCode', label: 'Code', render: (v) => <span className="text-code">{String(v)}</span> },
    { key: 'patient', label: 'Patient', render: (v) => (v as Referral['patient']).displayName },
    { key: 'sourceHospital', label: 'From', render: (v) => (v as Referral['sourceHospital']).name },
    { key: 'destinationHospital', label: 'To', render: (v) => (v as Referral['destinationHospital']).name },
    { key: 'urgencyLevel', label: 'Urgency', render: (v) => <UrgencyBadge urgency={v as UrgencyLevel} /> },
    { key: 'status', label: 'Status', render: (v) => <ReferralStatusBadge status={v as ReferralStatus} /> },
    {
      key: 'createdAt', label: 'Created',
      render: (v) => new Date(String(v)).toLocaleDateString(),
    },
  ];

  return (
    <>
      <PageHeader
        title="Referrals"
        subtitle="Track and manage patient referrals between facilities"
        actions={
          <Button variant="primary" onClick={() => navigate(ROUTES.REFERRAL_NEW)}>
            + New Referral
          </Button>
        }
      />

      <ReferralFilters
        status={status} onStatusChange={(v) => { setStatus(v); setPage(1); }}
        urgencyLevel={urgencyLevel} onUrgencyChange={(v) => { setUrgencyLevel(v); setPage(1); }}
        hospitalRole={hospitalRole} onHospitalRoleChange={(v) => { setHospitalRole(v); setPage(1); }}
      />

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        loading={isLoading}
        onRowClick={(row) => navigate(ROUTES.REFERRAL_DETAIL(row.id))}
        emptyTitle="No referrals match your filters"
        emptyBody="Try adjusting your filters, or create a new referral."
      />

      {data?.meta.pagination && (
        <PaginationBar meta={data.meta.pagination} onPageChange={setPage} onLimitChange={onLimitChange} />
      )}
    </>
  );
};

export default ReferralListPage;
