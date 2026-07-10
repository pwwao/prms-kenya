import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Alert from '@mui/material/Alert';
import { PageHeader } from '@/shared/components/ui';
import { CreateReferralForm } from '../components/CreateReferralForm';
import { useCreateReferral } from '../hooks/useReferrals';
import { usePatientDetail } from '@/features/patients/hooks/usePatients';
import { getApiErrorMessage, getApiErrorDetails } from '@/shared/api/api-client';
import { ROUTES } from '@/shared/constants/routes.constants';
import type { CreateReferralRequest } from '@/types/referral.types';

const CreateReferralPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const presetPatientId = searchParams.get('patientId');
  const { data: presetPatient } = usePatientDetail(presetPatientId ? Number(presetPatientId) : undefined);
  const mutation = useCreateReferral();

  const fieldErrors: Record<string, string> = {};
  if (mutation.isError) {
    for (const d of getApiErrorDetails(mutation.error)) fieldErrors[d.field] = d.message;
  }

  const handleSubmit = (values: CreateReferralRequest) => mutation.mutate(values);

  return (
    <>
      <PageHeader
        title="New Referral"
        breadcrumbs={[{ label: 'Referrals', href: ROUTES.REFERRALS }, { label: 'New Referral' }]}
      />

      <Card variant="outlined" sx={{ maxWidth: 780 }}>
        <CardContent sx={{ p: 4 }}>
          {mutation.isError && (
            <Alert severity="error" sx={{ mb: 3 }}>{getApiErrorMessage(mutation.error)}</Alert>
          )}
          <CreateReferralForm
            initialPatient={presetPatient ?? null}
            submitting={mutation.isPending}
            errors={fieldErrors}
            onSubmit={handleSubmit}
            onCancel={() => navigate(ROUTES.REFERRALS)}
          />
        </CardContent>
      </Card>
    </>
  );
};

export default CreateReferralPage;
