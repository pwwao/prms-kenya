import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';
import { AuthLayout } from './AuthLayout';
import { FormField, Button } from '@/shared/components/ui';
import { authApi } from '../api/auth.api';
import { ROUTES } from '@/shared/constants/routes.constants';

const schema = z.object({ email: z.string().email('Enter a valid email address') });
type FormValues = z.infer<typeof schema>;

const ForgotPasswordPage: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) => authApi.forgotPassword(values),
    onSuccess: () => setSubmitted(true), // Always show success — prevents email enumeration
    onError: () => setSubmitted(true),
  });

  if (submitted) {
    return (
      <AuthLayout title="Check your inbox">
        <Stack spacing={2.5} textAlign="center">
          <Typography variant="body2" color="text.secondary">
            If an account exists for that email, a reset link has been sent. It expires in 15 minutes.
          </Typography>
          <Link href={ROUTES.LOGIN} variant="body2">← Back to Login</Link>
        </Stack>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Reset Your Password" subtitle="Enter your registered email address.">
      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate>
        <Stack spacing={2.5}>
          <FormField
            label="Email Address"
            type="email"
            autoFocus
            error={errors.email?.message}
            {...register('email')}
          />
          <Button type="submit" variant="primary" size="large" loading={mutation.isPending} fullWidth>
            Send Reset Link
          </Button>
          <Link href={ROUTES.LOGIN} variant="body2" align="center" sx={{ display: 'block' }}>
            ← Back to Login
          </Link>
        </Stack>
      </form>
    </AuthLayout>
  );
};

export default ForgotPasswordPage;
