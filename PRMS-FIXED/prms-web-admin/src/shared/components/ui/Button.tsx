import React from 'react';
import MuiButton, { type ButtonProps as MuiButtonProps } from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';

export interface ButtonProps extends Omit<MuiButtonProps, 'variant' | 'color'> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  loading?: boolean;
}

const variantMap: Record<string, { variant: MuiButtonProps['variant']; color: MuiButtonProps['color'] }> = {
  primary:   { variant: 'contained', color: 'primary' },
  secondary: { variant: 'contained', color: 'secondary' },
  outline:   { variant: 'outlined', color: 'primary' },
  ghost:     { variant: 'text', color: 'primary' },
  danger:    { variant: 'contained', color: 'error' },
};

/**
 * Standard PRMS button. Wraps MUI Button with the design system's
 * semantic variant names (see PRMS_Design_System_Complete.md §5.1).
 */
export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  loading = false,
  disabled,
  children,
  startIcon,
  ...rest
}) => {
  const mapped = variantMap[variant];
  return (
    <MuiButton
      variant={mapped.variant}
      color={mapped.color}
      disabled={disabled || loading}
      startIcon={loading ? <CircularProgress size={16} color="inherit" /> : startIcon}
      {...rest}
    >
      {loading ? 'Please wait…' : children}
    </MuiButton>
  );
};
