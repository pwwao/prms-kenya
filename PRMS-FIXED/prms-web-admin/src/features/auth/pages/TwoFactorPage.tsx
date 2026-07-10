import React from 'react';
import { Navigate } from 'react-router-dom';
import { AuthLayout } from './AuthLayout';
import { TwoFactorForm } from '../components/TwoFactorForm';
import { useAppSelector } from '@/shared/hooks/useAppDispatch';
import { ROUTES } from '@/shared/constants/routes.constants';

const TwoFactorPage: React.FC = () => {
  const preAuthToken = useAppSelector((s) => s.auth.preAuthToken);

  // Guard: nothing to verify if the user landed here without logging in first
  if (!preAuthToken) return <Navigate to={ROUTES.LOGIN} replace />;

  return (
    <AuthLayout title="Two-Factor Verification">
      <TwoFactorForm />
    </AuthLayout>
  );
};

export default TwoFactorPage;
