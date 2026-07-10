import React, { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Typography from '@mui/material/Typography';
import { FormField, Button } from '@/shared/components/ui';
import { useUpdateStaffStatus } from '../hooks/useUsers';
import { useToast } from '@/shared/components/ui/Toast';
import type { StaffMember } from '@/types/user.types';

interface StaffStatusDialogProps {
  open: boolean;
  onClose: () => void;
  staff: StaffMember;
}

/** Suspend / Reactivate a staff account — see User Flow HA-02 */
export const StaffStatusDialog: React.FC<StaffStatusDialogProps> = ({ open, onClose, staff }) => {
  const [reason, setReason] = useState('');
  const toast = useToast();
  const targetStatus = staff.status === 'Suspended' ? 'Active' : 'Suspended';
  const mutation = useUpdateStaffStatus(staff.id);

  const handleConfirm = () => {
    mutation.mutate(
      { status: targetStatus, reason: targetStatus === 'Suspended' ? reason : undefined },
      {
        onSuccess: () => {
          toast.success(`${staff.fullName}'s account is now ${targetStatus}.`);
          onClose();
        },
      }
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        {targetStatus === 'Suspended' ? 'Suspend' : 'Reactivate'} {staff.fullName}'s account?
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" mb={2}>
          {targetStatus === 'Suspended'
            ? 'They will be immediately logged out and unable to sign in until reactivated.'
            : 'They will regain access to the mobile app immediately.'}
        </Typography>
        {targetStatus === 'Suspended' && (
          <FormField
            label="Reason"
            required
            multiline
            minRows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Staff member on administrative leave"
          />
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2.5, pt: 0 }}>
        <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>Cancel</Button>
        <Button
          variant={targetStatus === 'Suspended' ? 'danger' : 'primary'}
          onClick={handleConfirm}
          loading={mutation.isPending}
          disabled={targetStatus === 'Suspended' && reason.trim().length === 0}
        >
          {targetStatus === 'Suspended' ? 'Suspend Account' : 'Reactivate Account'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
