import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Skeleton from '@mui/material/Skeleton';
import { PageHeader, FormField, Button } from '@/shared/components/ui';
import { useStaffDetail, useUpdateStaff } from '../hooks/useUsers';
import { useToast } from '@/shared/components/ui/Toast';
import { getApiErrorMessage } from '@/shared/api/api-client';
import { ROUTES } from '@/shared/constants/routes.constants';

const schema = z.object({
  fullName: z.string().min(2, 'Required'),
  email: z.string().email('Enter a valid email address').optional().or(z.literal('')),
  phoneNumber: z.string().regex(/^\+254\d{9}$/, 'Format: +254XXXXXXXXX').optional().or(z.literal('')),
});

type FormValues = z.infer<typeof schema>;

const EditStaffPage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { data: staff, isLoading } = useStaffDetail(Number(userId));
  const mutation = useUpdateStaff(Number(userId));

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (staff) {
      reset({ fullName: staff.fullName, email: staff.email ?? '', phoneNumber: staff.phoneNumber ?? '' });
    }
  }, [staff, reset]);

  if (isLoading || !staff) {
    return <Skeleton variant="rounded" height={400} />;
  }

  const onSubmit = (values: FormValues) => {
    mutation.mutate({
      ...values,
      email: values.email ? values.email : null,
      phoneNumber: values.phoneNumber ? values.phoneNumber : null,
    }, {
      onSuccess: () => {
        toast.success('Staff profile updated.');
        navigate(ROUTES.USERS);
      },
    });
  };

  return (
    <>
      <PageHeader
        title={`Edit ${staff.fullName}`}
        breadcrumbs={[{ label: 'Staff', href: ROUTES.USERS }, { label: 'Edit' }]}
      />

      <Card variant="outlined" sx={{ maxWidth: 560 }}>
        <CardContent sx={{ p: 4 }}>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <Stack spacing={3}>
              {mutation.isError && <Alert severity="error">{getApiErrorMessage(mutation.error)}</Alert>}

              <FormField label="Username" value={staff.username} disabled helperText="Username cannot be changed" />
              <FormField label="Full Name" required error={errors.fullName?.message} {...register('fullName')} />
              <FormField label="Email Address" type="email" error={errors.email?.message} {...register('email')} />
              <FormField label="Phone Number" error={errors.phoneNumber?.message} {...register('phoneNumber')} />

              <Stack direction="row" spacing={1.5} justifyContent="flex-end">
                <Button variant="outline" onClick={() => navigate(ROUTES.USERS)}>Cancel</Button>
                <Button type="submit" variant="primary" loading={mutation.isPending}>Save Changes</Button>
              </Stack>
            </Stack>
          </form>
        </CardContent>
      </Card>
    </>
  );
};

export default EditStaffPage;
