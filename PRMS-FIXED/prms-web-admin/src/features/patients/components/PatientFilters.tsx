import React from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';
import type { Gender } from '@/types/patient.types';

interface PatientFiltersProps {
  gender: Gender | '';
  onGenderChange: (gender: Gender | '') => void;
  county: string;
  onCountyChange: (county: string) => void;
  search: string;
  onSearchChange: (q: string) => void;
}

const genders: Gender[] = ['Male', 'Female', 'Other', 'Prefer not to say'];

export const PatientFilters: React.FC<PatientFiltersProps> = ({
  gender, onGenderChange, county, onCountyChange, search, onSearchChange,
}) => (
  <Box display="flex" gap={1.5} flexWrap="wrap" mb={2}>
    <TextField
      size="small"
      placeholder="Search by name…"
      value={search}
      onChange={(e) => onSearchChange(e.target.value)}
      sx={{ minWidth: 260 }}
      InputProps={{
        startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
      }}
    />
    <TextField
      size="small"
      label="County"
      value={county}
      onChange={(e) => onCountyChange(e.target.value)}
      sx={{ minWidth: 160 }}
    />
    <TextField
      size="small"
      select
      label="Gender"
      value={gender}
      onChange={(e) => onGenderChange(e.target.value as Gender | '')}
      sx={{ minWidth: 160 }}
    >
      <MenuItem value="">All genders</MenuItem>
      {genders.map((g) => <MenuItem key={g} value={g}>{g}</MenuItem>)}
    </TextField>
  </Box>
);
