import React from 'react';
import Chip from '@mui/material/Chip';
import type { HospitalStatus } from '@/types/hospital.types';
import type { UserStatus } from '@/types/auth.types';

export type StatusKey = HospitalStatus | UserStatus;

const statusColorMap: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  Pending:    { bg: '#FFF7ED', text: '#843F00', border: '#FED7AA', dot: '#B85C00' },
  Approved:   { bg: '#ECFDF5', text: '#166534', border: '#A7F3D0', dot: '#16834B' },
  Suspended:  { bg: '#FEF2F2', text: '#7F1D1D', border: '#FECACA', dot: '#B91C1C' },
  Rejected:   { bg: '#FEF2F2', text: '#7F1D1D', border: '#FECACA', dot: '#B91C1C' },
  Active:     { bg: '#ECFDF5', text: '#166534', border: '#A7F3D0', dot: '#16834B' },
  Inactive:   { bg: '#E8EDF2', text: '#3A5068', border: '#D8E2EA', dot: '#8AA0B4' },
};

interface StatusBadgeProps {
  status: StatusKey;
  size?: 'small' | 'medium';
}

/** Status pill with a colored dot — see PRMS_Design_System_Complete.md §5.2 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'small' }) => {
  const cfg = statusColorMap[status] ?? statusColorMap.Inactive;

  return (
    <Chip
      size={size}
      label={status}
      role="status"
      aria-label={`Status: ${status}`}
      icon={
        <span
          aria-hidden="true"
          style={{
            width: 6, height: 6, borderRadius: '50%',
            backgroundColor: cfg.dot, marginLeft: 8,
          }}
        />
      }
      sx={{
        backgroundColor: cfg.bg,
        color: cfg.text,
        border: `1px solid ${cfg.border}`,
        fontWeight: 600,
        '& .MuiChip-icon': { marginRight: '-4px' },
      }}
    />
  );
};
