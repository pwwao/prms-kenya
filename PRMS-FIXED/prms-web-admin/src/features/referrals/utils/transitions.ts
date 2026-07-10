import type { ReferralStatus } from '@/types/referral.types';
import type { UserRole } from '@/types/auth.types';

const ALLOWED_TRANSITIONS: Record<ReferralStatus, ReferralStatus[]> = {
  Draft: ['Dispatched'],
  Dispatched: ['Received', 'Draft'],
  Received: ['Accepted', 'Rejected'],
  Accepted: ['Completed', 'Rejected'],
  Rejected: ['Draft'],
  Completed: [],
};

const ROLE_TRANSITIONS: Record<UserRole, ReferralStatus[]> = {
  'System Admin': ['Dispatched', 'Received', 'Accepted', 'Rejected', 'Completed', 'Draft'],
  'Hospital Admin': ['Dispatched', 'Received', 'Accepted', 'Rejected', 'Completed', 'Draft'],
  Clinician: ['Dispatched', 'Received', 'Accepted', 'Rejected', 'Completed', 'Draft'],
  Receptionist: ['Dispatched', 'Received'],
};

const STATUS_LABELS: Record<ReferralStatus, string> = {
  Draft: 'Return to Draft',
  Dispatched: 'Dispatch Referral',
  Received: 'Mark as Received',
  Accepted: 'Accept Referral',
  Rejected: 'Reject Referral',
  Completed: 'Mark Completed',
};

/** Returns the set of statuses this role may move the referral into from its current status. */
export function getAvailableTransitions(current: ReferralStatus, role: UserRole): ReferralStatus[] {
  const allowed = new Set(ALLOWED_TRANSITIONS[current]);
  const permitted = new Set(ROLE_TRANSITIONS[role] ?? []);
  return [...allowed].filter((s) => permitted.has(s));
}

export function transitionLabel(target: ReferralStatus): string {
  return STATUS_LABELS[target];
}

export function isDangerousTransition(target: ReferralStatus): boolean {
  return target === 'Rejected';
}
