import React from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import type { ReferralStatus, UrgencyLevel, HospitalRoleFilter } from '@/types/referral.types';

interface ReferralFiltersProps {
  status: ReferralStatus | '';
  onStatusChange: (status: ReferralStatus | '') => void;
  urgencyLevel: UrgencyLevel | '';
  onUrgencyChange: (urgency: UrgencyLevel | '') => void;
  hospitalRole: HospitalRoleFilter;
  onHospitalRoleChange: (role: HospitalRoleFilter) => void;
}

const statuses: ReferralStatus[] = ['Draft', 'Dispatched', 'Received', 'Accepted', 'Rejected', 'Completed'];
const urgencies: UrgencyLevel[] = ['Routine', 'Urgent', 'Emergent'];

export const ReferralFilters: React.FC<ReferralFiltersProps> = ({
  status, onStatusChange, urgencyLevel, onUrgencyChange, hospitalRole, onHospitalRoleChange,
}) => (
  <Box display="flex" gap={1.5} flexWrap="wrap" mb={2}>
    <TextField
      size="small"
      select
      label="Direction"
      value={hospitalRole}
      onChange={(e) => onHospitalRoleChange(e.target.value as HospitalRoleFilter)}
      sx={{ minWidth: 160 }}
    >
      <MenuItem value="any">All referrals</MenuItem>
      <MenuItem value="source">Sent by us</MenuItem>
      <MenuItem value="destination">Received by us</MenuItem>
    </TextField>
    <TextField
      size="small"
      select
      label="Status"
      value={status}
      onChange={(e) => onStatusChange(e.target.value as ReferralStatus | '')}
      sx={{ minWidth: 160 }}
    >
      <MenuItem value="">All statuses</MenuItem>
      {statuses.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
    </TextField>
    <TextField
      size="small"
      select
      label="Urgency"
      value={urgencyLevel}
      onChange={(e) => onUrgencyChange(e.target.value as UrgencyLevel | '')}
      sx={{ minWidth: 160 }}
    >
      <MenuItem value="">All urgencies</MenuItem>
      {urgencies.map((u) => <MenuItem key={u} value={u}>{u}</MenuItem>)}
    </TextField>
  </Box>
);
