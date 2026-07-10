import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import { PageHeader, Button, DataTable, type Column } from '@/shared/components/ui';
import { PatientForm } from '../components/PatientForm';
import { ReferralStatusBadge } from '@/features/referrals/components/ReferralStatusBadge';
import type { ReferralStatus } from '@/types/referral.types';
import { usePatientDetail, usePatientReferralHistory, useUpdatePatient } from '../hooks/usePatients';
import { getApiErrorMessage, getApiErrorDetails } from '@/shared/api/api-client';
import { ROUTES } from '@/shared/constants/routes.constants';
import type { CreatePatientRequest } from '@/types/patient.types';
import type { PatientReferralHistoryEntry } from '@/types/patient.types';

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box display="flex" justifyContent="space-between" py={1.25} borderBottom="1px solid" borderColor="divider">
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="body2" fontWeight={600}>{value}</Typography>
    </Box>
  );
}

const PatientDetailPage: React.FC = () => {
  const { patientId } = useParams<{ patientId: string }>();
  const id = Number(patientId);
  const navigate = useNavigate();
  const { data: patient, isLoading } = usePatientDetail(id);
  const { data: history, isLoading: historyLoading } = usePatientReferralHistory(id);
  const [editing, setEditing] = useState(false);
  const mutation = useUpdatePatient(id);

  if (isLoading || !patient) {
    return (
      <Box>
        <Skeleton variant="text" width={240} height={40} sx={{ mb: 2 }} />
        <Skeleton variant="rounded" height={320} />
      </Box>
    );
  }

  const fieldErrors: Record<string, string> = {};
  if (mutation.isError) {
    for (const d of getApiErrorDetails(mutation.error)) fieldErrors[d.field] = d.message;
  }

  const handleUpdate = (values: CreatePatientRequest) => {
    mutation.mutate(
      {
        fullName: values.fullName,
        phone: values.phone || null,
        gender: values.gender,
        dateOfBirth: values.dateOfBirth,
        county: values.county,
        subCounty: values.subCounty || null,
        nextOfKinName: values.nextOfKinName || null,
        nextOfKinPhone: values.nextOfKinPhone || null,
      },
      { onSuccess: () => setEditing(false) },
    );
  };

  const historyColumns: Column<PatientReferralHistoryEntry>[] = [
    { key: 'referralCode', label: 'Referral Code', render: (v) => <span className="text-code">{String(v)}</span> },
    { key: 'sourceHospitalName', label: 'From' },
    { key: 'destinationHospitalName', label: 'To' },
    { key: 'urgencyLevel', label: 'Urgency' },
    { key: 'status', label: 'Status', render: (v) => <ReferralStatusBadge status={v as ReferralStatus} /> },
    { key: 'createdAt', label: 'Date', render: (v) => new Date(String(v)).toLocaleDateString() },
  ];

  return (
    <>
      <PageHeader
        title={patient.fullName}
        breadcrumbs={[{ label: 'Patients', href: ROUTES.PATIENTS }, { label: patient.fullName }]}
        actions={
          <Box display="flex" gap={1.5}>
            <Button variant="outline" onClick={() => setEditing((v) => !v)}>
              {editing ? 'Cancel Edit' : 'Edit Details'}
            </Button>
            <Button variant="primary" onClick={() => navigate(`${ROUTES.REFERRAL_NEW}?patientId=${patient.id}`)}>
              + New Referral
            </Button>
          </Box>
        }
      />

      <Grid container spacing={3}>
        <Grid item xs={12} md={editing ? 12 : 5}>
          <Card variant="outlined">
            <CardContent sx={{ p: editing ? 4 : 3 }}>
              {editing ? (
                <>
                  <Typography variant="subtitle1" mb={2}>Edit Patient Details</Typography>
                  {mutation.isError && (
                    <Alert severity="error" sx={{ mb: 2 }}>{getApiErrorMessage(mutation.error)}</Alert>
                  )}
                  <PatientForm
                    mode="edit"
                    initialValues={patient}
                    submitting={mutation.isPending}
                    errors={fieldErrors}
                    onSubmit={handleUpdate}
                    onCancel={() => setEditing(false)}
                  />
                </>
              ) : (
                <>
                  <Typography variant="subtitle1" mb={1}>Demographics</Typography>
                  <DetailRow label="National ID" value={patient.nationalId ?? '—'} />
                  <DetailRow label="Gender" value={patient.gender} />
                  <DetailRow label="Date of Birth" value={patient.dateOfBirth} />
                  <DetailRow label="Phone" value={patient.phone ?? '—'} />
                  <DetailRow label="County" value={patient.county} />
                  <DetailRow label="Sub-County" value={patient.subCounty ?? '—'} />
                  <DetailRow label="Next of Kin" value={patient.nextOfKinName ?? '—'} />
                  <DetailRow label="Next of Kin Phone" value={patient.nextOfKinPhone ?? '—'} />
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        {!editing && (
          <Grid item xs={12} md={7}>
            <Typography variant="subtitle1" mb={1.5}>Referral History</Typography>
            <DataTable
              columns={historyColumns}
              data={history ?? []}
              loading={historyLoading}
              onRowClick={(row) => navigate(ROUTES.REFERRAL_DETAIL(row.id))}
              emptyTitle="No referrals yet"
              emptyBody="This patient has not been referred to another facility."
            />
          </Grid>
        )}
      </Grid>
    </>
  );
};

export default PatientDetailPage;
