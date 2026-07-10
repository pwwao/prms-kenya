import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import CircularProgress from '@mui/material/CircularProgress';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import { FormField, Button, EmptyState } from '@/shared/components/ui';
import { usePatientSearch } from '../hooks/usePatients';
import type { Patient } from '@/types/patient.types';

interface PatientQuickSearchProps {
  open: boolean;
  onClose: () => void;
  onSelect: (patient: Patient) => void;
}

/**
 * Modal used to find an existing patient by National ID or phone number
 * before creating a referral — mirrors the mobile PatientSearchScreen flow.
 */
export const PatientQuickSearch: React.FC<PatientQuickSearchProps> = ({ open, onClose, onSelect }) => {
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const { data: results, isLoading, isFetched } = usePatientSearch(
    { q: query.trim() || undefined },
    submitted && query.trim().length > 0,
  );

  const handleSearch = () => setSubmitted(true);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Find Patient</DialogTitle>
      <DialogContent>
        <Box mb={2} mt={0.5}>
          <FormField
            label="Name, National ID, or Phone"
            placeholder="Enter a name, ID, or phone number"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSubmitted(false); }}
          />
        </Box>
        <Button variant="outline" onClick={handleSearch} disabled={!query.trim()}>
          Search
        </Button>

        <Box mt={2}>
          {isLoading && (
            <Box display="flex" justifyContent="center" py={3}><CircularProgress size={28} /></Box>
          )}

          {isFetched && !isLoading && (results?.length ?? 0) === 0 && (
            <EmptyState
              title="No matching patient"
              body="Try a name, national ID, or phone number, or register this patient as new."
            />
          )}

          {(results?.length ?? 0) > 0 && (
            <List>
              {results!.map((patient) => (
                <ListItemButton key={patient.id} onClick={() => onSelect(patient)}>
                  <ListItemText
                    primary={patient.fullName}
                    secondary={`${patient.gender} · ${patient.county}${patient.nationalId ? ` · ID ${patient.nationalId}` : ''}`}
                  />
                </ListItemButton>
              ))}
            </List>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};
