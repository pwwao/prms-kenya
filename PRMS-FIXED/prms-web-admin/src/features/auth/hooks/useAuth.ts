import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authApi, isTwoFactorResponse } from '../api/auth.api';
import { loggedIn, preAuthSet, loggedOut as loggedOutAction } from '../store/auth.slice';
import { useAppDispatch, useAppSelector } from '@/shared/hooks/useAppDispatch';
import { ROUTES } from '@/shared/constants/routes.constants';
import type { LoginRequest, Verify2FARequest } from '@/types/auth.types';

export function useAuth() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user, accessToken, refreshToken, preAuthToken } = useAppSelector((s) => s.auth);

  const loginMutation = useMutation({
    mutationFn: (payload: LoginRequest) => authApi.login(payload),
    onSuccess: (data) => {
      if (isTwoFactorResponse(data)) {
        dispatch(preAuthSet(data.preAuthToken));
        navigate(ROUTES.VERIFY_2FA);
      } else {
        dispatch(loggedIn(data));
        navigate(ROUTES.DASHBOARD);
      }
    },
  });

  const verify2FAMutation = useMutation({
    mutationFn: (otpCode: string) => {
      if (!preAuthToken) throw new Error('No pre-auth session. Please log in again.');
      const payload: Verify2FARequest = { preAuthToken, otpCode };
      return authApi.verify2FA(payload);
    },
    onSuccess: (data) => {
      dispatch(loggedIn(data));
      navigate(ROUTES.DASHBOARD);
    },
  });

  const logout = async () => {
    try {
      if (refreshToken) await authApi.logout(refreshToken);
    } finally {
      dispatch(loggedOutAction());
      navigate(ROUTES.LOGIN);
    }
  };

  return {
    user,
    isAuthenticated: !!accessToken,
    login: loginMutation.mutate,
    isLoggingIn: loginMutation.isPending,
    loginError: loginMutation.error,
    verify2FA: verify2FAMutation.mutate,
    isVerifying2FA: verify2FAMutation.isPending,
    verify2FAError: verify2FAMutation.error,
    logout,
  };
}
