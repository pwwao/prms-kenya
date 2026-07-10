import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import Autocomplete from '@mui/material/Autocomplete';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import { FormField, Button } from '@/shared/components/ui';
import { PatientQuickSearch } from '@/features/patients/components/PatientQuickSearch';
import { useHospitalsList } from '@/features/hospitals/hooks/useHospitals';
import { useDebounce } from '@/shared/hooks/useDebounce';
import type { Patient } from '@/types/patient.types';
import type { CreateReferralRequest, UrgencyLevel } from '@/types/referral.types';

const urgencies: UrgencyLevel[] = ['Routine', 'Urgent', 'Emergent'];

interface CreateReferralFormProps {
  initialPatient?: Patient | null;
  submitting?: boolean;
  errors?: Record<string, string>;
  onSubmit: (values: CreateReferralRequest) => void;
  onCancel?: () => void;
}

export const CreateReferralForm: React.FC<CreateReferralFormProps> = ({
  initialPatient, submitting, errors = {}, onSubmit, onCancel,
}) => {
  const [patient, setPatient] = useState<Patient | null>(initialPatient ?? null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [destinationHospitalId, setDestinationHospitalId] = useState<number | ''>('');
  const [hospitalQuery, setHospitalQuery] = useState('');
  const [urgencyLevel, setUrgencyLevel] = useState<UrgencyLevel>('Routine');
  const [reasonForReferral, setReasonForReferral] = useState('');
  const [clinicalSummary, setClinicalSummary] = useState('');

  const debouncedHospitalQuery = useDebounce(hospitalQuery);
  const { data: hospitalResults, isLoading: hospitalsLoading } = useHospitalsList({
    status: 'Approved',
    q: debouncedHospitalQuery || undefined,
    page: 1,
    limit: 20,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient || !destinationHospitalId) return;
    onSubmit({
      patientId: patient.id,
      destinationHospitalId: Number(destinationHospitalId),
      urgencyLevel,
      reasonForReferral,
      clinicalSummary: clinicalSummary || null,
    });
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Grid container spacing={2.5}>
        <Grid item xs={12}>
          {patient ? (
            <Box display="flex" alignItems="center" gap={1.5}>
              <Chip
                label={`${patient.fullName} · ${patient.gender} · ${patient.county}`}
                onDelete={() => setPatient(null)}
                color="primary"
                variant="outlined"
              />
            </Box>
          ) : (
            <Button type="button" variant="outline" onClick={() => setSearchOpen(true)}>
              Select Patient…
            </Button>
          )}
          {errors.patientId && !patient && (
            <Box mt={0.5} fontSize="0.75rem" color="error.main">{errors.patientId}</Box>
          )}
        </Grid>

        <Grid item xs={12} sm={6}>
          <Autocomplete
            options={hospitalResults?.data ?? []}
            getOptionLabel={(h) => h.name}
            loading={hospitalsLoading}
            onInputChange={(_, value) => setHospitalQuery(value)}
            onChange={(_, value) => setDestinationHospitalId(value?.id ?? '')}
            renderInput={(params) => (
              <FormField
                {...params}
                label="Destination Hospital"
                required
                error={errors.destinationHospitalId}
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {hospitalsLoading && <CircularProgress size={16} />}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <FormField
            select
            label="Urgency Level"
            required
            value={urgencyLevel}
            onChange={(e) => setUrgencyLevel(e.target.value as UrgencyLevel)}
            error={errors.urgencyLevel}
          >
            {urgencies.map((u) => <MenuItem key={u} value={u}>{u}</MenuItem>)}
          </FormField>
        </Grid>

        <Grid item xs={12}>
          <FormField
            label="Reason for Referral"
            required
            multiline
            minRows={2}
            value={reasonForReferral}
            onChange={(e) => setReasonForReferral(e.target.value)}
            error={errors.reasonForReferral}
          />
        </Grid>

        <Grid item xs={12}>
          <FormField
            label="Clinical Summary (optional)"
            multiline
            minRows={4}
            value={clinicalSummary}
            onChange={(e) => setClinicalSummary(e.target.value)}
            error={errors.clinicalSummary}
          />
        </Grid>
      </Grid>

      <Box display="flex" gap={1.5} mt={3.5}>
        <Button
          type="submit"
          variant="primary"
          loading={submitting}
          disabled={!patient || !destinationHospitalId || !reasonForReferral}
        >
          Create Referral
        </Button>
        {onCancel && <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>}
      </Box>

      <PatientQuickSearch
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelect={(p) => { setPatient(p); setSearchOpen(false); }}
      />
    </Box>
  );
};
