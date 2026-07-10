import React, { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { usePermissions } from '@/shared/hooks/usePermissions';
import { ROUTES } from '@/shared/constants/routes.constants';
import type { UserRole } from '@/types/auth.types';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
}

/**
 * Route guard. Redirects unauthenticated users to /login (preserving the
 * intended destination), and authenticated-but-unauthorized users to
 * /unauthorized — per Architecture Contract §11.2.
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, hasRole } = usePermissions();
  const location = useLocation();

  if (!user) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  if (allowedRoles && !hasRole(allowedRoles)) {
    return <Navigate to={ROUTES.UNAUTHORIZED} replace />;
  }

  return <>{children}</>;
};
