import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader, DataTable, PaginationBar, Button, type Column } from '@/shared/components/ui';
import { PatientFilters } from '../components/PatientFilters';
import { usePatientsList } from '../hooks/usePatients';
import { usePagination } from '@/shared/hooks/usePagination';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { ROUTES } from '@/shared/constants/routes.constants';
import type { Patient, Gender } from '@/types/patient.types';

function calcAge(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth);
  const diff = Date.now() - dob.getTime();
  return Math.abs(new Date(diff).getUTCFullYear() - 1970);
}

const PatientListPage: React.FC = () => {
  const navigate = useNavigate();
  const { page, limit, setPage, onLimitChange } = usePagination(20);
  const [gender, setGender] = useState<Gender | ''>('');
  const [county, setCounty] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const debouncedCounty = useDebounce(county);

  const { data, isLoading } = usePatientsList({
    page, limit,
    gender: gender || undefined,
    county: debouncedCounty || undefined,
    q: debouncedSearch || undefined,
    sortBy: 'created_at',
    sortDir: 'desc',
  });

  const columns: Column<Patient>[] = [
    { key: 'fullName', label: 'Full Name' },
    {
      key: 'nationalId', label: 'National ID',
      render: (v) => <span className="text-code">{v ? String(v) : '—'}</span>,
    },
    { key: 'gender', label: 'Gender' },
    {
      key: 'dateOfBirth', label: 'Age',
      render: (v) => (v ? calcAge(String(v)) : '—'),
    },
    { key: 'county', label: 'County' },
    { key: 'phone', label: 'Phone', render: (v) => (v ? String(v) : '—') },
  ];

  return (
    <>
      <PageHeader
        title="Patients"
        subtitle="Search and manage registered patient records"
        actions={
          <Button variant="primary" onClick={() => navigate(ROUTES.PATIENT_NEW)}>
            + Register Patient
          </Button>
        }
      />

      <PatientFilters
        gender={gender} onGenderChange={(v) => { setGender(v); setPage(1); }}
        county={county} onCountyChange={(v) => { setCounty(v); setPage(1); }}
        search={search} onSearchChange={(v) => { setSearch(v); setPage(1); }}
      />

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        loading={isLoading}
        onRowClick={(row) => navigate(ROUTES.PATIENT_DETAIL(row.id))}
        emptyTitle="No patients found"
        emptyBody="Try adjusting your search, or register a new patient."
      />

      {data?.meta.pagination && (
        <PaginationBar meta={data.meta.pagination} onPageChange={setPage} onLimitChange={onLimitChange} />
      )}
    </>
  );
};

export default PatientListPage;
