import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import { FormField, Button } from '@/shared/components/ui';
import { useAuth } from '../hooks/useAuth';
import { getApiErrorMessage } from '@/shared/api/api-client';

const otpSchema = z.object({
  otpCode: z.string().length(6, 'Enter the 6-digit code').regex(/^\d{6}$/, 'Code must be numeric'),
});

type OtpFormValues = z.infer<typeof otpSchema>;

export const TwoFactorForm: React.FC = () => {
  const { verify2FA, isVerifying2FA, verify2FAError } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OtpFormValues>({ resolver: zodResolver(otpSchema) });

  const onSubmit = (values: OtpFormValues) => verify2FA(values.otpCode);

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <Stack spacing={2.5}>
        <Typography variant="body2" color="text.secondary">
          Enter the 6-digit code from your authenticator app, or the SMS code we sent you.
        </Typography>

        {verify2FAError && <Alert severity="error">{getApiErrorMessage(verify2FAError)}</Alert>}

        <FormField
          label="Verification Code"
          inputMode="numeric"
          autoFocus
          inputProps={{ maxLength: 6, style: { letterSpacing: '0.4em', textAlign: 'center', fontSize: '1.25rem' } }}
          error={errors.otpCode?.message}
          {...register('otpCode')}
        />

        <Button type="submit" variant="primary" size="large" loading={isVerifying2FA} fullWidth>
          Verify Code
        </Button>
      </Stack>
    </form>
  );
};
