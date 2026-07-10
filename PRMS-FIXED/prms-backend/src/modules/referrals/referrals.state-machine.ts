/**
 * Referrals State Machine — Module 5
 *
 * Architecture Contract §2.3 — enforces the 6-state lifecycle:
 *   Draft → Dispatched → Received → Accepted → Completed
 *                                 ↘ Rejected  → Draft (re-submit)
 *   Dispatched → Draft (recall)
 *   Accepted   → Rejected (clinical grounds, reason required)
 *
 * This module is the ONLY place transition rules are defined.
 * The stored procedure sp_transition_referral_status mirrors this map
 * at the DB layer as a safety net — the application layer validates first.
 */

import { InvalidStateError } from '../../shared/errors/domain.errors.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export type TReferralStatus =
  | 'Draft'
  | 'Dispatched'
  | 'Received'
  | 'Accepted'
  | 'Rejected'
  | 'Completed';

export type TReferralUrgency = 'Routine' | 'Urgent' | 'Emergent';

export interface ITransitionContext {
  newStatus: TReferralStatus;
  /** Required when transitioning to Rejected */
  rejectionReason?: string | null;
  /** Optional narrative for the referral_log */
  notes?: string | null;
}

// ─── Allowed transitions map ──────────────────────────────────────────────────
// Exactly mirrors sp_transition_referral_status in the DB

const ALLOWED_TRANSITIONS: Record<TReferralStatus, ReadonlySet<TReferralStatus>> = {
  Draft:      new Set<TReferralStatus>(['Dispatched']),
  Dispatched: new Set<TReferralStatus>(['Received', 'Draft']),  // Draft = recalled
  Received:   new Set<TReferralStatus>(['Accepted', 'Rejected']),
  Accepted:   new Set<TReferralStatus>(['Completed', 'Rejected']),
  Rejected:   new Set<TReferralStatus>(['Draft']),              // Draft = revised & re-submitted
  Completed:  new Set<TReferralStatus>([]),                     // terminal
};

// ─── Role → permitted transition map ─────────────────────────────────────────
// Architecture Contract §10.3

const ROLE_TRANSITIONS: Record<string, ReadonlySet<TReferralStatus>> = {
  'System Admin':   new Set<TReferralStatus>(['Dispatched', 'Received', 'Accepted', 'Rejected', 'Completed', 'Draft']),
  'Hospital Admin': new Set<TReferralStatus>(['Dispatched', 'Received', 'Accepted', 'Rejected', 'Completed', 'Draft']),
  'Clinician':      new Set<TReferralStatus>(['Dispatched', 'Received', 'Accepted', 'Rejected', 'Completed', 'Draft']),
  'Receptionist':   new Set<TReferralStatus>(['Dispatched', 'Received']),
};

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Validates a requested status transition.
 * Throws InvalidStateError (HTTP 422) if the transition is not allowed.
 *
 * @param currentStatus  - Current status from DB
 * @param ctx            - Transition context (new status + reason)
 * @param requestingRole - Role of the acting user
 */
export function validateTransition(
  currentStatus: TReferralStatus,
  ctx: ITransitionContext,
  requestingRole: string,
): void {
  const { newStatus, rejectionReason } = ctx;

  // 1. Check state machine allows this transition
  if (!ALLOWED_TRANSITIONS[currentStatus]?.has(newStatus)) {
    throw new InvalidStateError(
      `Invalid status transition: '${currentStatus}' → '${newStatus}'. ` +
      `Allowed from '${currentStatus}': ${
        Array.from(ALLOWED_TRANSITIONS[currentStatus] ?? []).join(', ') || 'none (terminal state)'
      }`,
    );
  }

  // 2. Check role is permitted to trigger this transition
  if (!ROLE_TRANSITIONS[requestingRole]?.has(newStatus)) {
    throw new InvalidStateError(
      `Role '${requestingRole}' is not permitted to transition a referral to '${newStatus}'`,
    );
  }

  // 3. Rejection requires a reason
  if (newStatus === 'Rejected' && !rejectionReason?.trim()) {
    throw new InvalidStateError(
      `A rejection_reason is required when transitioning to 'Rejected'`,
    );
  }
}

/**
 * Returns the set of states a given role can transition TO from the current state.
 * Used by the API to return available actions to the client.
 */
export function getAvailableTransitions(
  currentStatus: TReferralStatus,
  requestingRole: string,
): TReferralStatus[] {
  const stateMachineAllowed = ALLOWED_TRANSITIONS[currentStatus] ?? new Set();
  const roleAllowed         = ROLE_TRANSITIONS[requestingRole]   ?? new Set();

  return Array.from(stateMachineAllowed).filter((s) => roleAllowed.has(s));
}

/**
 * Returns true if the referral is in a terminal state (Completed).
 */
export function isTerminalState(status: TReferralStatus): boolean {
  return ALLOWED_TRANSITIONS[status]?.size === 0;
}

/**
 * Returns a human-readable description of the transition.
 */
export function describeTransition(from: TReferralStatus, to: TReferralStatus): string {
  const map: Partial<Record<`${TReferralStatus}->${TReferralStatus}`, string>> = {
    'Draft->Dispatched':     'Referral dispatched to receiving facility',
    'Dispatched->Received':  'Receiving facility acknowledged the referral',
    'Dispatched->Draft':     'Referral recalled by originating facility',
    'Received->Accepted':    'Receiving clinician accepted the referral',
    'Received->Rejected':    'Receiving clinician rejected the referral',
    'Accepted->Completed':   'Referral completed — patient treatment concluded',
    'Accepted->Rejected':    'Referral rejected on clinical grounds',
    'Rejected->Draft':       'Referral revised and re-submitted',
  };
  return map[`${from}->${to}`] ?? `Status changed from ${from} to ${to}`;
}
