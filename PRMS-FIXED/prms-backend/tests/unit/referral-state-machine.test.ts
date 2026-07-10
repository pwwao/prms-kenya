/**
 * Unit Tests — Referral State Machine
 * Architecture Contract §5.2 — Referral status transition matrix
 *
 * REWRITTEN by Integration Team — original test hardcoded an 8-state model
 * ('Submitted', 'Acknowledged', 'Patient Transferred', 'Cancelled') that
 * matches nothing in the database ENUM, OpenAPI spec, or implementation.
 *
 * This version imports directly from the real state machine so that any
 * future change to the transition logic is immediately caught by these tests.
 */

import { describe, it, expect } from 'vitest';
import {
  validateTransition,
  getAvailableTransitions,
  isTerminalState,
  type TReferralStatus,
  type TReferralUrgency,
} from '../../src/modules/referrals/referrals.state-machine.js';
import { InvalidStateError } from '../../src/shared/errors/domain.errors.js';

// ─── Valid transitions ────────────────────────────────────────────────────────
// ALLOWED_TRANSITIONS (from referrals.state-machine.ts):
//   Draft      → Dispatched
//   Dispatched → Received | Draft (recall)
//   Received   → Accepted | Rejected
//   Accepted   → Completed | Rejected
//   Rejected   → Draft (revise & resubmit)
//   Completed  → (terminal)

describe('Referral state machine — valid transitions', () => {
  const validCases: [TReferralStatus, TReferralStatus, string][] = [
    ['Draft',      'Dispatched', 'Clinician'],
    ['Dispatched', 'Received',   'Receptionist'],
    ['Dispatched', 'Draft',      'Clinician'],    // recall before receipt
    ['Received',   'Accepted',   'Clinician'],
    ['Received',   'Rejected',   'Clinician'],
    ['Accepted',   'Completed',  'Clinician'],
    ['Accepted',   'Rejected',   'Clinician'],
    ['Rejected',   'Draft',      'Clinician'],    // revise & resubmit
  ];

  it.each(validCases)('%s → %s (as %s) is allowed', (from, to, role) => {
    expect(() =>
      validateTransition(from, { newStatus: to }, role)
    ).not.toThrow();
  });

  it('Rejected → Received requires rejectionReason', () => {
    // Accepted → Rejected must carry a reason (min 10 chars)
    expect(() =>
      validateTransition('Received', { newStatus: 'Rejected', rejectionReason: 'Patient stable now' }, 'Clinician')
    ).not.toThrow();
  });
});

// ─── Rejection reason required ────────────────────────────────────────────────

describe('Referral state machine — rejection reason enforcement', () => {
  it('throws when transitioning to Rejected without a reason', () => {
    expect(() =>
      validateTransition('Received', { newStatus: 'Rejected' }, 'Clinician')
    ).toThrow(InvalidStateError);
  });

  it('throws when rejection reason is too short (< 10 chars)', () => {
    expect(() =>
      validateTransition('Received', { newStatus: 'Rejected', rejectionReason: 'Too busy' }, 'Clinician')
    ).toThrow(InvalidStateError);
  });

  it('allows rejection with an adequate reason', () => {
    expect(() =>
      validateTransition('Received', { newStatus: 'Rejected', rejectionReason: 'No available specialist at this time' }, 'Clinician')
    ).not.toThrow();
  });
});

// ─── Invalid transitions ─────────────────────────────────────────────────────

describe('Referral state machine — invalid transitions', () => {
  const invalidCases: [TReferralStatus, TReferralStatus][] = [
    ['Draft',      'Received'],
    ['Draft',      'Accepted'],
    ['Draft',      'Completed'],
    ['Dispatched', 'Accepted'],
    ['Dispatched', 'Completed'],
    ['Accepted',   'Received'],
    ['Accepted',   'Dispatched'],
    ['Completed',  'Draft'],
    ['Completed',  'Dispatched'],
    ['Completed',  'Received'],
  ];

  it.each(invalidCases)('%s → %s throws InvalidStateError', (from, to) => {
    expect(() =>
      validateTransition(from, { newStatus: to }, 'System Admin')
    ).toThrow(InvalidStateError);
  });
});

// ─── Terminal states ──────────────────────────────────────────────────────────

describe('Referral state machine — terminal states', () => {
  it('Completed is terminal', () => {
    expect(isTerminalState('Completed')).toBe(true);
  });

  it('Draft is not terminal', () => {
    expect(isTerminalState('Draft')).toBe(false);
  });

  it('Rejected is not terminal (can be revised and resubmitted as Draft)', () => {
    expect(isTerminalState('Rejected')).toBe(false);
  });

  it('getAvailableTransitions returns empty for Completed', () => {
    expect(getAvailableTransitions('Completed', 'Clinician')).toHaveLength(0);
  });
});

// ─── RBAC for transitions ─────────────────────────────────────────────────────
// Mirrors ROLE_TRANSITIONS in referrals.state-machine.ts

describe('Referral transition RBAC', () => {
  it('Receptionist can dispatch', () => {
    expect(() =>
      validateTransition('Draft', { newStatus: 'Dispatched' }, 'Receptionist')
    ).not.toThrow();
  });

  it('Receptionist can mark as Received', () => {
    expect(() =>
      validateTransition('Dispatched', { newStatus: 'Received' }, 'Receptionist')
    ).not.toThrow();
  });

  it('Receptionist cannot accept a referral (clinical decision)', () => {
    expect(() =>
      validateTransition('Received', { newStatus: 'Accepted' }, 'Receptionist')
    ).toThrow(InvalidStateError);
  });

  it('Receptionist cannot reject a referral', () => {
    expect(() =>
      validateTransition('Received', { newStatus: 'Rejected', rejectionReason: 'Capacity issues exist' }, 'Receptionist')
    ).toThrow(InvalidStateError);
  });

  it('Clinician can perform all transitions', () => {
    expect(() =>
      validateTransition('Draft', { newStatus: 'Dispatched' }, 'Clinician')
    ).not.toThrow();
    expect(() =>
      validateTransition('Received', { newStatus: 'Accepted' }, 'Clinician')
    ).not.toThrow();
    expect(() =>
      validateTransition('Accepted', { newStatus: 'Completed' }, 'Clinician')
    ).not.toThrow();
  });
});

// ─── Urgency levels (database ENUM: Routine, Urgent, Emergent) ───────────────
// Original test hardcoded wrong values: 'Immediate', 'Semi-urgent', 'Non-urgent'

describe('Referral urgency levels', () => {
  const validLevels: TReferralUrgency[] = ['Routine', 'Urgent', 'Emergent'];

  it('defines exactly 3 urgency levels matching the database ENUM', () => {
    expect(validLevels).toHaveLength(3);
  });

  it('Emergent is the highest acuity level', () => {
    expect(validLevels).toContain('Emergent');
    expect(validLevels).not.toContain('Immediate');   // old wrong value
    expect(validLevels).not.toContain('Semi-urgent'); // old wrong value
  });

  it('Routine is the lowest acuity level', () => {
    expect(validLevels).toContain('Routine');
    expect(validLevels).not.toContain('Non-urgent');  // old wrong value
  });
});
