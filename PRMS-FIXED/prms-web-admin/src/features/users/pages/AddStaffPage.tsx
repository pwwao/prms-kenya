import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';
import Box from '@mui/material/Box';
import { PageHeader, FormField, Button } from '@/shared/components/ui';
import { useCreateStaff } from '../hooks/useUsers';
import { getApiErrorMessage } from '@/shared/api/api-client';
import { ROUTES } from '@/shared/constants/routes.constants';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '@/shared/hooks/useAppDispatch';

const schema = z.object({
  role: z.enum(['Clinician', 'Receptionist']),
  fullName: z.string().min(2, 'Enter the staff member\'s full name'),
  username: z.string().min(4, 'Minimum 4 characters').regex(/^[a-zA-Z0-9_]+$/, 'Letters, numbers, underscores only'),
  email: z.string().email('Enter a valid email address').optional().or(z.literal('')),
  phoneNumber: z.string().regex(/^\+254\d{9}$/, 'Format: +254XXXXXXXXX').optional().or(z.literal('')).or(z.literal('+254')),
});

type FormValues = z.infer<typeof schema>;

function generateTemporaryPassword() {
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*()-_=+';
  const randomValues = crypto.getRandomValues(new Uint32Array(16));
  return Array.from(randomValues, (value) => charset[value % charset.length]).join('');
}

const AddStaffPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const mutation = useCreateStaff();
  const {
    register, handleSubmit, control, formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'Clinician', phoneNumber: '+254' },
  });

  // BUG FIX: Guard against missing hospitalId in auth state.
  // A Hospital Admin must always have a hospitalId. If it is null the session
  // is corrupt — surface a clear message rather than sending a bad request.
  const hospitalId = user?.hospitalId ?? null;
  const missingHospital = user?.role === 'Hospital Admin' && hospitalId === null;

  return (
    <>
      <PageHeader
        title="Add Staff Member"
        breadcrumbs={[{ label: 'Staff', href: ROUTES.USERS }, { label: 'Add Staff Member' }]}
      />

      {missingHospital && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Your account is not associated with a hospital. Please log out and log back in,
          or contact your System Administrator to fix your account.
        </Alert>
      )}

      <Card variant="outlined" sx={{ maxWidth: 560 }}>
        <CardContent sx={{ p: 4 }}>
          <form
            onSubmit={handleSubmit((v) => {
              if (missingHospital) return; // extra safety guard
              mutation.mutate({
                ...v,
                email: v.email ? v.email : null,
                phoneNumber: v.phoneNumber && v.phoneNumber !== '+254' ? v.phoneNumber : null,
                // hospitalId is guaranteed non-null here for Hospital Admin;
                // System Admin may legitimately pass null (creates a system-level user).
                hospitalId,
                password: generateTemporaryPassword(),
              });
            })}
            noValidate
          >
            <Stack spacing={3}>
              {mutation.isError && <Alert severity="error">{getApiErrorMessage(mutation.error)}</Alert>}

              <Box>
                <Typography variant="subtitle2" mb={1}>Role</Typography>
                <Controller
                  name="role"
                  control={control}
                  render={({ field }) => (
                    <RadioGroup row {...field}>
                      <FormControlLabel value="Clinician" control={<Radio />} label="Clinician" />
                      <FormControlLabel value="Receptionist" control={<Radio />} label="Receptionist" />
                    </RadioGroup>
                  )}
                />
              </Box>

              <FormField label="Full Name" required error={errors.fullName?.message} {...register('fullName')} />
              <FormField label="Username" required error={errors.username?.message} {...register('username')} />
              <FormField label="Email Address" type="email" error={errors.email?.message} {...register('email')} />
              <FormField label="Phone Number" error={errors.phoneNumber?.message} {...register('phoneNumber')} />

              <Alert severity="info" variant="outlined">
                A temporary password is generated automatically for the new account.
              </Alert>

              <Stack direction="row" spacing={1.5} justifyContent="flex-end">
                <Button variant="outline" onClick={() => navigate(ROUTES.USERS)}>Cancel</Button>
                <Button
                  type="submit"
                  variant="primary"
                  loading={mutation.isPending}
                  disabled={missingHospital}
                >
                  Create Account
                </Button>
              </Stack>
            </Stack>
          </form>
        </CardContent>
      </Card>
    </>
  );
};

export default AddStaffPage;
