/**
 * useAuth — current user + role-based permission helpers
 */
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '@store/index';
import { logoutThunk } from '@store/slices/authSlice';
import {
  canDispatch,
  canMarkReceived,
  canAcceptOrReject,
  canMarkComplete,
  canRedispatch,
  canChat,
} from '@utils/helpers';
import type { ReferralStatus } from '@types/index';

export function useAuth() {
  const dispatch = useDispatch<AppDispatch>();
  const { user, isAuthenticated, isLoading, error } = useSelector((s: RootState) => s.auth);

  const role = user?.role ?? '';

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    role,
    isClinician: role === 'Clinician',
    isReceptionist: role === 'Receptionist',
    // BUG FIX: Role strings now match backend JWT ('Hospital Admin' / 'System Admin' with spaces)
    isHospitalAdmin: role === 'Hospital Admin',
    isSystemAdmin: role === 'System Admin',
    logout: () => dispatch(logoutThunk()),

    // Referral action permissions for current user's role
    permissions: {
      canDispatch: (status: ReferralStatus) => canDispatch(status, role),
      canMarkReceived: (status: ReferralStatus) => canMarkReceived(status, role),
      canAcceptOrReject: (status: ReferralStatus) => canAcceptOrReject(status, role),
      canMarkComplete: (status: ReferralStatus) => canMarkComplete(status, role),
      canRedispatch: (status: ReferralStatus) => canRedispatch(status, role),
      canChat: canChat(role),
    },
  };
}
