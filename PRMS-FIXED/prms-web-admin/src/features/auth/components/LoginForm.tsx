import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Link from '@mui/material/Link';
import { FormField, Button } from '@/shared/components/ui';
import { useAuth } from '../hooks/useAuth';
import { getApiErrorMessage } from '@/shared/api/api-client';
import { ROUTES } from '@/shared/constants/routes.constants';

const loginSchema = z.object({
  identifier: z.string().min(1, 'Username or email is required'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export const LoginForm: React.FC = () => {
  const { login, isLoggingIn, loginError } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = (values: LoginFormValues) => login(values);

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <Stack spacing={2.5}>
        {loginError && <Alert severity="error">{getApiErrorMessage(loginError)}</Alert>}

        <FormField
          label="Username or Email"
          autoComplete="username"
          autoFocus
          error={errors.identifier?.message}
          {...register('identifier')}
        />

        <FormField
          label="Password"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />

        <Button type="submit" variant="primary" size="large" loading={isLoggingIn} fullWidth>
          Sign In
        </Button>

        <Link href={ROUTES.FORGOT_PASSWORD} variant="body2" align="center" sx={{ display: 'block' }}>
          Forgot Password?
        </Link>
      </Stack>
    </form>
  );
};
