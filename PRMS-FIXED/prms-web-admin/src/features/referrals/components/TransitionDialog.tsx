import React, { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import { FormField, Button } from '@/shared/components/ui';
import { useTransitionReferral } from '../hooks/useReferrals';
import { getApiErrorMessage } from '@/shared/api/api-client';
import { transitionLabel, isDangerousTransition } from '../utils/transitions';
import type { ReferralStatus } from '@/types/referral.types';

interface TransitionDialogProps {
  open: boolean;
  onClose: () => void;
  referralId: number;
  target: ReferralStatus;
}

export const TransitionDialog: React.FC<TransitionDialogProps> = ({ open, onClose, referralId, target }) => {
  const [rejectionReason, setRejectionReason] = useState('');
  const [notes, setNotes] = useState('');
  const mutation = useTransitionReferral(referralId);
  const requiresReason = target === 'Rejected';

  const handleConfirm = () => {
    mutation.mutate(
      { status: target, rejectionReason: requiresReason ? rejectionReason : undefined, notes: notes || undefined },
      { onSuccess: () => { onClose(); setRejectionReason(''); setNotes(''); } },
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{transitionLabel(target)}</DialogTitle>
      <DialogContent>
        {mutation.isError && <Alert severity="error" sx={{ mb: 2 }}>{getApiErrorMessage(mutation.error)}</Alert>}
        <Box display="flex" flexDirection="column" gap={2} mt={0.5}>
          {requiresReason && (
            <FormField
              label="Rejection Reason"
              required
              multiline
              minRows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              helperText="Minimum 10 characters — required for rejections"
            />
          )}
          <FormField
            label="Notes (optional)"
            multiline
            minRows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2.5, pt: 0 }}>
        <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>Cancel</Button>
        <Button
          variant={isDangerousTransition(target) ? 'danger' : 'primary'}
          onClick={handleConfirm}
          loading={mutation.isPending}
          disabled={requiresReason && rejectionReason.trim().length < 10}
        >
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  );
};
