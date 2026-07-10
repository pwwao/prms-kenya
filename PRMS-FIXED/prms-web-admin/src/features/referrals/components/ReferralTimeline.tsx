import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import { EmptyState } from '@/shared/components/ui';
import type { ReferralTimelineEntry } from '@/types/referral.types';

const dotColor: Record<string, string> = {
  Draft: '#8AA0B4',
  Dispatched: '#1E56A0',
  Received: '#6D28D9',
  Accepted: '#16834B',
  Rejected: '#B91C1C',
  Completed: '#0B6B5D',
};

interface ReferralTimelineProps {
  entries?: ReferralTimelineEntry[];
  loading?: boolean;
}

/** Simple vertical timeline — avoids pulling in @mui/lab, which isn't part of this app's dependency set. */
export const ReferralTimeline: React.FC<ReferralTimelineProps> = ({ entries, loading }) => {
  if (loading) {
    return (
      <>
        <Skeleton variant="rounded" height={56} sx={{ mb: 1.5 }} />
        <Skeleton variant="rounded" height={56} sx={{ mb: 1.5 }} />
        <Skeleton variant="rounded" height={56} />
      </>
    );
  }

  if (!entries || entries.length === 0) {
    return <EmptyState title="No history yet" body="Status changes for this referral will appear here." />;
  }

  return (
    <Box>
      {entries.map((entry, i) => (
        <Box key={i} display="flex" gap={2}>
          <Box display="flex" flexDirection="column" alignItems="center" width={16}>
            <Box
              sx={{
                width: 12, height: 12, borderRadius: '50%', mt: 0.5, flexShrink: 0,
                backgroundColor: dotColor[entry.status] ?? '#8AA0B4',
              }}
            />
            {i < entries.length - 1 && (
              <Box sx={{ flex: 1, width: '2px', backgroundColor: 'divider', my: 0.5, minHeight: 24 }} />
            )}
          </Box>
          <Box pb={3} flex={1}>
            <Typography variant="body2" fontWeight={600}>
              {entry.previousStatus ? `${entry.previousStatus} → ${entry.status}` : entry.status}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {new Date(entry.timestamp).toLocaleString()} · by {entry.actionBy.fullName}
            </Typography>
            {entry.notes && (
              <Typography variant="body2" color="text.secondary" mt={0.5} fontStyle="italic">
                “{entry.notes}”
              </Typography>
            )}
          </Box>
        </Box>
      ))}
    </Box>
  );
};
