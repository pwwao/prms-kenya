import React from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';

interface AuditLogFiltersProps {
  actionType: string;
  onActionTypeChange: (v: string) => void;
  ip: string;
  onIpChange: (v: string) => void;
  startDate: string;
  onStartDateChange: (v: string) => void;
  endDate: string;
  onEndDateChange: (v: string) => void;
}

export const AuditLogFilters: React.FC<AuditLogFiltersProps> = ({
  actionType, onActionTypeChange, ip, onIpChange,
  startDate, onStartDateChange, endDate, onEndDateChange,
}) => (
  <Box display="flex" gap={1.5} flexWrap="wrap" mb={2}>
    <TextField
      size="small" placeholder="Action type, e.g. VIEW_PATIENT_PII"
      value={actionType} onChange={(e) => onActionTypeChange(e.target.value)}
      sx={{ minWidth: 240 }}
      InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
    />
    <TextField
      size="small" placeholder="Filter by IP address"
      value={ip} onChange={(e) => onIpChange(e.target.value)}
      sx={{ minWidth: 180 }}
    />
    <TextField
      size="small" type="date" label="From" value={startDate}
      onChange={(e) => onStartDateChange(e.target.value)}
      InputLabelProps={{ shrink: true }}
    />
    <TextField
      size="small" type="date" label="To" value={endDate}
      onChange={(e) => onEndDateChange(e.target.value)}
      InputLabelProps={{ shrink: true }}
    />
  </Box>
);
