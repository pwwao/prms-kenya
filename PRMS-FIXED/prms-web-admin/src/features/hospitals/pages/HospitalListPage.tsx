import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Chip from '@mui/material/Chip';
import { PageHeader, DataTable, PaginationBar, StatusBadge, type Column } from '@/shared/components/ui';
import { HospitalFilters } from '../components/HospitalFilters';
import { useHospitalsList } from '../hooks/useHospitals';
import { usePagination } from '@/shared/hooks/usePagination';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { ROUTES } from '@/shared/constants/routes.constants';
import type { Hospital, HospitalStatus, FacilityLevel } from '@/types/hospital.types';

const HospitalListPage: React.FC = () => {
  const navigate = useNavigate();
  const { page, limit, setPage, onLimitChange } = usePagination(20);
  const [status, setStatus] = useState<HospitalStatus | ''>('');
  const [facilityLevel, setFacilityLevel] = useState<FacilityLevel | ''>('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);

  const { data, isLoading } = useHospitalsList({
    page, limit,
    status: status || undefined,
    facilityLevel: facilityLevel || undefined,
    q: debouncedSearch || undefined,
    sortBy: 'created_at',
    sortDir: 'desc',
  });

  const columns: Column<Hospital>[] = [
    { key: 'name', label: 'Hospital Name' },
    {
      key: 'mohCode', label: 'MoH Code',
      render: (v) => <span className="text-code">{String(v)}</span>,
    },
    { key: 'county', label: 'County' },
    { key: 'facilityLevel', label: 'Level' },
    {
      key: 'status', label: 'Status',
      render: (v) => <StatusBadge status={v as HospitalStatus} />,
    },
    {
      key: 'action', label: '', align: 'right',
      render: () => <Chip label="Review →" size="small" variant="outlined" />,
    },
  ];

  return (
    <>
      <PageHeader
        title="Hospitals"
        subtitle="Review applications and manage facility access"
      />

      <HospitalFilters
        status={status} onStatusChange={(v) => { setStatus(v); setPage(1); }}
        facilityLevel={facilityLevel} onFacilityLevelChange={(v) => { setFacilityLevel(v); setPage(1); }}
        search={search} onSearchChange={(v) => { setSearch(v); setPage(1); }}
      />

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        loading={isLoading}
        onRowClick={(row) => navigate(ROUTES.HOSPITAL_DETAIL(row.id))}
        emptyTitle="No hospitals match your filters"
        emptyBody="Try adjusting your search or filter criteria."
      />

      {data?.meta.pagination && (
        <PaginationBar meta={data.meta.pagination} onPageChange={setPage} onLimitChange={onLimitChange} />
      )}
    </>
  );
};

export default HospitalListPage;
