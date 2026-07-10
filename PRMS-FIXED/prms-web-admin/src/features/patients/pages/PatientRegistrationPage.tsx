import React from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Alert from '@mui/material/Alert';
import { PageHeader } from '@/shared/components/ui';
import { PatientForm } from '../components/PatientForm';
import { useCreatePatient } from '../hooks/usePatients';
import { getApiErrorMessage, getApiErrorDetails } from '@/shared/api/api-client';
import { ROUTES } from '@/shared/constants/routes.constants';
import type { CreatePatientRequest } from '@/types/patient.types';

const PatientRegistrationPage: React.FC = () => {
  const navigate = useNavigate();
  const mutation = useCreatePatient();

  const fieldErrors: Record<string, string> = {};
  if (mutation.isError) {
    for (const d of getApiErrorDetails(mutation.error)) fieldErrors[d.field] = d.message;
  }

  const handleSubmit = (values: CreatePatientRequest) => {
    mutation.mutate({
      ...values,
      nationalId: values.nationalId || null,
      phone: values.phone || null,
      subCounty: values.subCounty || null,
      nextOfKinName: values.nextOfKinName || null,
      nextOfKinPhone: values.nextOfKinPhone || null,
    });
  };

  return (
    <>
      <PageHeader
        title="Register Patient"
        breadcrumbs={[{ label: 'Patients', href: ROUTES.PATIENTS }, { label: 'Register Patient' }]}
      />

      <Card variant="outlined" sx={{ maxWidth: 720 }}>
        <CardContent sx={{ p: 4 }}>
          {mutation.isError && (
            <Alert severity="error" sx={{ mb: 3 }}>{getApiErrorMessage(mutation.error)}</Alert>
          )}
          <PatientForm
            mode="create"
            submitting={mutation.isPending}
            errors={fieldErrors}
            onSubmit={handleSubmit}
            onCancel={() => navigate(ROUTES.PATIENTS)}
          />
        </CardContent>
      </Card>
    </>
  );
};

export default PatientRegistrationPage;
