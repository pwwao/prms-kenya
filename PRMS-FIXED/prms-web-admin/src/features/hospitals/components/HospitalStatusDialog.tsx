import React, { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import { FormField, Button } from '@/shared/components/ui';
import { useUpdateHospitalStatus } from '../hooks/useHospitals';
import { useToast } from '@/shared/components/ui/Toast';
import { getApiErrorMessage } from '@/shared/api/api-client';
import type { Hospital, HospitalStatus } from '@/types/hospital.types';

interface HospitalStatusDialogProps {
  open: boolean;
  onClose: () => void;
  hospital: Hospital;
  targetStatus: HospitalStatus;
}

const consequenceCopy: Record<HospitalStatus, string> = {
  Approved:  'This will activate the facility and allow their Admin to create staff accounts.',
  Suspended: "This will lock all active sessions for this facility's users and pause in-progress referrals.",
  Rejected:  'The facility will need to resubmit a new application to gain access.',
  Pending:   'This will return the facility to the review queue.',
};

const requiresReason: HospitalStatus[] = ['Suspended', 'Rejected'];

/** Used for Approve / Reject / Suspend / Reinstate actions — see User Flows SA-02, SA-03 */
export const HospitalStatusDialog: React.FC<HospitalStatusDialogProps> = ({
  open, onClose, hospital, targetStatus,
}) => {
  const [reason, setReason] = useState('');
  const toast = useToast();
  const mutation = useUpdateHospitalStatus(hospital.id);
  const needsReason = requiresReason.includes(targetStatus);

  const handleConfirm = () => {
    mutation.mutate(
      { status: targetStatus, reason: reason || undefined },
      {
        onSuccess: () => {
          toast.success(`Hospital status updated to ${targetStatus}.`);
          setReason('');
          onClose();
        },
      }
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        {targetStatus === 'Approved' ? 'Approve' : targetStatus === 'Suspended' ? 'Suspend' : 'Reject'}{' '}
        {hospital.name}?
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" mb={2}>
          {consequenceCopy[targetStatus]}
        </Typography>

        {mutation.isError && (
          <Alert severity="error" sx={{ mb: 2 }}>{getApiErrorMessage(mutation.error)}</Alert>
        )}

        {needsReason && (
          <FormField
            label="Reason"
            required
            multiline
            minRows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain the reason for this action…"
          />
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2.5, pt: 0 }}>
        <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>Cancel</Button>
        <Button
          variant={targetStatus === 'Suspended' || targetStatus === 'Rejected' ? 'danger' : 'primary'}
          onClick={handleConfirm}
          loading={mutation.isPending}
          disabled={needsReason && reason.trim().length === 0}
        >
          Confirm {targetStatus}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
