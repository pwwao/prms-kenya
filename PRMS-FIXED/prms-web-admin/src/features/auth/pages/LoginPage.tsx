import React from 'react';
import { AuthLayout } from './AuthLayout';
import { LoginForm } from '../components/LoginForm';

const LoginPage: React.FC = () => (
  <AuthLayout title="PRMS Kenya" subtitle="Sign in to the administration portal">
    <LoginForm />
  </AuthLayout>
);

export default LoginPage;
