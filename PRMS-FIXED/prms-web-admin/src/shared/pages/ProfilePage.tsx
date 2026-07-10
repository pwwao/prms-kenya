import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import { PageHeader, FormField, Button } from '@/shared/components/ui';
import { usePermissions } from '@/shared/hooks/usePermissions';
import { authApi } from '@/features/auth/api/auth.api';
import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/shared/components/ui/Toast';
import { getApiErrorMessage } from '@/shared/api/api-client';

const schema = z.object({
  currentPassword: z.string().min(1, 'Required'),
  newPassword: z.string().min(12, 'Minimum 12 characters'),
  confirmPassword: z.string(),
}).refine((v) => v.newPassword === v.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type FormValues = z.infer<typeof schema>;

const ProfilePage: React.FC = () => {
  const { user } = usePermissions();
  const toast = useToast();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) => authApi.changePassword(values),
    onSuccess: () => {
      toast.success('Password changed successfully.');
      reset();
    },
  });

  return (
    <>
      <PageHeader title="My Profile" subtitle="Account details and security settings" />

      <Card variant="outlined" sx={{ maxWidth: 560, mb: 3 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="subtitle1" mb={2}>Account Information</Typography>
          <Stack spacing={1.5}>
            <Row label="Full Name" value={user?.fullName} />
            <Row label="Username" value={user?.username} />
            <Row label="Role" value={user?.role} />
            {user?.hospitalName && <Row label="Facility" value={user.hospitalName} />}
          </Stack>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ maxWidth: 560 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="subtitle1" mb={2}>Change Password</Typography>
          <form onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate>
            <Stack spacing={2.5}>
              {mutation.isError && <Alert severity="error">{getApiErrorMessage(mutation.error)}</Alert>}
              <FormField label="Current Password" type="password" error={errors.currentPassword?.message} {...register('currentPassword')} />
              <FormField label="New Password" type="password" error={errors.newPassword?.message} {...register('newPassword')} />
              <FormField label="Confirm New Password" type="password" error={errors.confirmPassword?.message} {...register('confirmPassword')} />
              <Divider />
              <Stack direction="row" justifyContent="flex-end">
                <Button type="submit" variant="primary" loading={mutation.isPending}>Update Password</Button>
              </Stack>
            </Stack>
          </form>
        </CardContent>
      </Card>
    </>
  );
};

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <Stack direction="row" justifyContent="space-between">
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="body2" fontWeight={600}>{value ?? '—'}</Typography>
    </Stack>
  );
}

export default ProfilePage;
