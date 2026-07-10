import React from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';
import type { HospitalStatus, FacilityLevel } from '@/types/hospital.types';

interface HospitalFiltersProps {
  status: HospitalStatus | '';
  onStatusChange: (status: HospitalStatus | '') => void;
  facilityLevel: FacilityLevel | '';
  onFacilityLevelChange: (level: FacilityLevel | '') => void;
  search: string;
  onSearchChange: (q: string) => void;
}

const statuses: HospitalStatus[] = ['Pending', 'Approved', 'Suspended', 'Rejected'];
const levels: FacilityLevel[] = ['Level 2', 'Level 3', 'Level 4', 'Level 5', 'Level 6'];

export const HospitalFilters: React.FC<HospitalFiltersProps> = ({
  status, onStatusChange, facilityLevel, onFacilityLevelChange, search, onSearchChange,
}) => (
  <Box display="flex" gap={1.5} flexWrap="wrap" mb={2}>
    <TextField
      size="small"
      placeholder="Search by name or MoH code…"
      value={search}
      onChange={(e) => onSearchChange(e.target.value)}
      sx={{ minWidth: 260 }}
      InputProps={{
        startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
      }}
    />
    <TextField
      size="small"
      select
      label="Status"
      value={status}
      onChange={(e) => onStatusChange(e.target.value as HospitalStatus | '')}
      sx={{ minWidth: 160 }}
    >
      <MenuItem value="">All statuses</MenuItem>
      {statuses.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
    </TextField>
    <TextField
      size="small"
      select
      label="Facility Level"
      value={facilityLevel}
      onChange={(e) => onFacilityLevelChange(e.target.value as FacilityLevel | '')}
      sx={{ minWidth: 160 }}
    >
      <MenuItem value="">All levels</MenuItem>
      {levels.map((l) => <MenuItem key={l} value={l}>{l}</MenuItem>)}
    </TextField>
  </Box>
);
