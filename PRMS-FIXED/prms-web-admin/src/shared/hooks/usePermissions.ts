import { useAppSelector } from './useAppDispatch';
import type { UserRole } from '@/types/auth.types';

export function usePermissions() {
  const user = useAppSelector((state) => state.auth.user);

  const hasRole = (allowed: UserRole[]): boolean => {
    if (!user) return false;
    return allowed.includes(user.role);
  };

  const isSystemAdmin = user?.role === 'System Admin';
  const isHospitalAdmin = user?.role === 'Hospital Admin';
  const isClinician = user?.role === 'Clinician';
  const isReceptionist = user?.role === 'Receptionist';

  return { user, hasRole, isSystemAdmin, isHospitalAdmin, isClinician, isReceptionist };
}
