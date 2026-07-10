import React from 'react';
import Drawer from '@mui/material/Drawer';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Divider from '@mui/material/Divider';
import CloseIcon from '@mui/icons-material/Close';
import type { AuditLog } from '@/types/audit.types';

interface AuditLogDetailDrawerProps {
  log: AuditLog | null;
  onClose: () => void;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box mb={2}>
      <Typography variant="caption" color="text.secondary" display="block" mb={0.25}>{label}</Typography>
      <Typography variant="body2" fontWeight={500}>{value}</Typography>
    </Box>
  );
}

export const AuditLogDetailDrawer: React.FC<AuditLogDetailDrawerProps> = ({ log, onClose }) => (
  <Drawer anchor="right" open={!!log} onClose={onClose}>
    <Box width={400} p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Audit Event #{log?.id}</Typography>
        <IconButton onClick={onClose} aria-label="Close"><CloseIcon /></IconButton>
      </Box>
      <Divider sx={{ mb: 2 }} />
      {log && (
        <>
          <Row label="Action Type" value={<span className="text-code">{log.actionType}</span>} />
          <Row label="Timestamp" value={new Date(log.timestamp).toLocaleString()} />
          <Row label="User" value={log.user ? `${log.user.username} (${log.user.role})` : 'System'} />
          <Row label="Resource Affected" value={log.resourceAffected} />
          <Row label="IP Address" value={log.ipAddress} />
          <Row label="User Agent" value={<Typography variant="caption">{log.userAgent}</Typography>} />
          {log.payloadSnapshot && (
            <Row
              label="Payload Snapshot"
              value={
                <Box
                  component="pre"
                  sx={{
                    bgcolor: 'grey.50', p: 1.5, borderRadius: 1, fontSize: '0.75rem',
                    overflow: 'auto', maxHeight: 240, border: '1px solid', borderColor: 'divider',
                  }}
                >
                  {JSON.stringify(JSON.parse(log.payloadSnapshot), null, 2)}
                </Box>
              }
            />
          )}
        </>
      )}
    </Box>
  </Drawer>
);
