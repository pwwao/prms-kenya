import React from 'react';
import TextField, { type TextFieldProps } from '@mui/material/TextField';

export interface FormFieldProps extends Omit<TextFieldProps, 'variant' | 'error'> {
  error?: string;
}

export const FormField = React.forwardRef<HTMLDivElement, FormFieldProps>(
  ({ error, helperText, ...rest }, ref) => (
    <TextField
      ref={ref}
      variant="outlined"
      fullWidth
      error={!!error}
      helperText={error ?? helperText}
      {...rest}
    />
  )
);

FormField.displayName = 'FormField';