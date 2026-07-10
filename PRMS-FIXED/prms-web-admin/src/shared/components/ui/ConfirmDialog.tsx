import React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import { Button } from './Button';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  body: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  loading?: boolean;
}

/** Used for: Approve/Reject/Suspend hospital, Suspend staff member, etc. */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open, onClose, onConfirm, title, body,
  confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  variant = 'primary', loading = false,
}) => (
  <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth aria-labelledby="confirm-dialog-title">
    <DialogTitle id="confirm-dialog-title">{title}</DialogTitle>
    <DialogContent>
      <DialogContentText component="div">{body}</DialogContentText>
    </DialogContent>
    <DialogActions sx={{ p: 2.5, pt: 0 }}>
      <Button variant="ghost" onClick={onClose} disabled={loading}>{cancelLabel}</Button>
      <Button variant={variant} onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
    </DialogActions>
  </Dialog>
);
