import React from 'react';
import Chip from '@mui/material/Chip';
import type { ReferralStatus, UrgencyLevel } from '@/types/referral.types';

const statusColorMap: Record<ReferralStatus, { bg: string; text: string; border: string; dot: string }> = {
  Draft:      { bg: '#E8EDF2', text: '#3A5068', border: '#D8E2EA', dot: '#8AA0B4' },
  Dispatched: { bg: '#EFF6FF', text: '#1E40AF', border: '#BFDBFE', dot: '#1E56A0' },
  Received:   { bg: '#F5F3FF', text: '#5B21B6', border: '#DDD6FE', dot: '#6D28D9' },
  Accepted:   { bg: '#ECFDF5', text: '#166534', border: '#A7F3D0', dot: '#16834B' },
  Rejected:   { bg: '#FEF2F2', text: '#7F1D1D', border: '#FECACA', dot: '#B91C1C' },
  Completed:  { bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0', dot: '#0B6B5D' },
};

const urgencyColorMap: Record<UrgencyLevel, { bg: string; text: string; border: string; dot: string }> = {
  Routine:  { bg: '#E8EDF2', text: '#3A5068', border: '#D8E2EA', dot: '#8AA0B4' },
  Urgent:   { bg: '#FFF7ED', text: '#843F00', border: '#FED7AA', dot: '#B85C00' },
  Emergent: { bg: '#FEF2F2', text: '#7F1D1D', border: '#FECACA', dot: '#B91C1C' },
};

function Pill({ label, cfg, size }: { label: string; cfg: { bg: string; text: string; border: string; dot: string }; size: 'small' | 'medium' }) {
  return (
    <Chip
      size={size}
      label={label}
      role="status"
      aria-label={label}
      icon={
        <span
          aria-hidden="true"
          style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: cfg.dot, marginLeft: 8 }}
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
}

export const ReferralStatusBadge: React.FC<{ status: ReferralStatus; size?: 'small' | 'medium' }> = ({
  status, size = 'small',
}) => <Pill label={status} cfg={statusColorMap[status]} size={size} />;

export const UrgencyBadge: React.FC<{ urgency: UrgencyLevel; size?: 'small' | 'medium' }> = ({
  urgency, size = 'small',
}) => <Pill label={urgency} cfg={urgencyColorMap[urgency]} size={size} />;
