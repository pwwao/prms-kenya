import type { UserRole } from '@/types/auth.types';

/** RBAC route guard map — see Architecture Contract §10.3 */
export const ROUTE_PERMISSIONS: Record<string, UserRole[]> = {
  '/dashboard':   ['System Admin', 'Hospital Admin', 'Clinician', 'Receptionist'],
  '/patients':    ['Clinician', 'Receptionist', 'Hospital Admin', 'System Admin'],
  '/referrals':   ['Clinician', 'Receptionist', 'Hospital Admin', 'System Admin'],
  '/referrals/:referralId/chat': ['Clinician'],
  '/notifications': ['System Admin', 'Hospital Admin', 'Clinician', 'Receptionist'],
  '/hospitals':   ['System Admin'],
  '/users':       ['Hospital Admin'],
  '/reports':     ['System Admin', 'Hospital Admin'],
  '/audit-logs':  ['System Admin'],
};
