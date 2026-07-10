import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import { FormField, Button } from '@/shared/components/ui';
import type { CreatePatientRequest, Gender, Patient } from '@/types/patient.types';

const genders: Gender[] = ['Male', 'Female', 'Other', 'Prefer not to say'];

interface PatientFormProps {
  initialValues?: Partial<Patient>;
  mode: 'create' | 'edit';
  submitting?: boolean;
  errors?: Record<string, string>;
  onSubmit: (values: CreatePatientRequest) => void;
  onCancel?: () => void;
}

export const PatientForm: React.FC<PatientFormProps> = ({
  initialValues, mode, submitting, errors = {}, onSubmit, onCancel,
}) => {
  const [values, setValues] = useState<CreatePatientRequest>({
    nationalId: initialValues?.nationalId ?? '',
    fullName: initialValues?.fullName ?? '',
    phone: initialValues?.phone ?? '',
    gender: initialValues?.gender ?? 'Male',
    dateOfBirth: initialValues?.dateOfBirth ?? '',
    county: initialValues?.county ?? '',
    subCounty: initialValues?.subCounty ?? '',
    nextOfKinName: initialValues?.nextOfKinName ?? '',
    nextOfKinPhone: initialValues?.nextOfKinPhone ?? '',
  });

  const set = <K extends keyof CreatePatientRequest>(key: K, value: CreatePatientRequest[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(values);
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Grid container spacing={2.5}>
        <Grid item xs={12} sm={6}>
          <FormField
            label="Full Name"
            required
            value={values.fullName}
            onChange={(e) => set('fullName', e.target.value)}
            error={errors.fullName}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormField
            label="National ID"
            value={values.nationalId ?? ''}
            onChange={(e) => set('nationalId', e.target.value)}
            error={errors.nationalId}
            disabled={mode === 'edit'}
            helperText={mode === 'edit' ? 'National ID cannot be changed once registered' : undefined}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormField
            select
            label="Gender"
            required
            value={values.gender}
            onChange={(e) => set('gender', e.target.value as Gender)}
            error={errors.gender}
          >
            {genders.map((g) => <MenuItem key={g} value={g}>{g}</MenuItem>)}
          </FormField>
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormField
            label="Date of Birth"
            type="date"
            required
            InputLabelProps={{ shrink: true }}
            value={values.dateOfBirth}
            onChange={(e) => set('dateOfBirth', e.target.value)}
            error={errors.dateOfBirth}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormField
            label="Phone Number"
            value={values.phone ?? ''}
            onChange={(e) => set('phone', e.target.value)}
            error={errors.phone}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormField
            label="County"
            required
            value={values.county}
            onChange={(e) => set('county', e.target.value)}
            error={errors.county}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormField
            label="Sub-County"
            value={values.subCounty ?? ''}
            onChange={(e) => set('subCounty', e.target.value)}
            error={errors.subCounty}
          />
        </Grid>
        <Grid item xs={12} sm={6} />
        <Grid item xs={12} sm={6}>
          <FormField
            label="Next of Kin Name"
            value={values.nextOfKinName ?? ''}
            onChange={(e) => set('nextOfKinName', e.target.value)}
            error={errors.nextOfKinName}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormField
            label="Next of Kin Phone"
            value={values.nextOfKinPhone ?? ''}
            onChange={(e) => set('nextOfKinPhone', e.target.value)}
            error={errors.nextOfKinPhone}
          />
        </Grid>
      </Grid>

      <Box display="flex" gap={1.5} mt={3.5}>
        <Button type="submit" variant="primary" loading={submitting}>
          {mode === 'create' ? 'Register Patient' : 'Save Changes'}
        </Button>
        {onCancel && <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>}
      </Box>
    </Box>
  );
};
