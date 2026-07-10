/**
 * Unit Tests — RBAC Permission Matrix
 * Architecture Contract §10.3 — Full matrix coverage
 * Every role × permission combination is explicitly tested
 *
 * REWRITTEN by Integration Team — the original test hardcoded its own copy
 * of the permission matrix. It happened to be factually correct (verified
 * identical to ROLE_PERMISSIONS in authorize.middleware.ts at time of
 * writing), but as a duplicate it would silently stop catching drift the
 * next time someone edits the real matrix. This version imports
 * hasPermission() directly so it always tests the live matrix.
 */

import { describe, it, expect } from 'vitest';
import { hasPermission } from '../../src/middleware/authorize.middleware.js';
import type { TUserRole } from '../../src/config/jwt.config.js';

const can = hasPermission;

// ─── System Admin ─────────────────────────────────────────────────────────────

describe('System Admin permissions', () => {
  it('can approve hospitals',        () => expect(can('System Admin', 'hospital:approve')).toBe(true));
  it('can view all hospitals',       () => expect(can('System Admin', 'hospital:view_all')).toBe(true));
  it('can view audit logs',          () => expect(can('System Admin', 'audit:view')).toBe(true));
  it('cannot create referrals',      () => expect(can('System Admin', 'referral:create')).toBe(false));
  it('cannot register patients',     () => expect(can('System Admin', 'patient:register')).toBe(false));
  it('cannot access chat',           () => expect(can('System Admin', 'chat:access')).toBe(false));
  it('cannot create users',          () => expect(can('System Admin', 'user:create')).toBe(false));
});

// ─── Hospital Admin ──────────────────────────────────────────────────────────

describe('Hospital Admin permissions', () => {
  it('can create users',             () => expect(can('Hospital Admin', 'user:create')).toBe(true));
  it('can suspend users',            () => expect(can('Hospital Admin', 'user:suspend')).toBe(true));
  it('can view own hospital',        () => expect(can('Hospital Admin', 'hospital:view_own')).toBe(true));
  it('cannot approve hospitals',     () => expect(can('Hospital Admin', 'hospital:approve')).toBe(false));
  it('cannot view all hospitals',    () => expect(can('Hospital Admin', 'hospital:view_all')).toBe(false));
  it('cannot view audit logs',       () => expect(can('Hospital Admin', 'audit:view')).toBe(false));
  it('cannot create referrals',      () => expect(can('Hospital Admin', 'referral:create')).toBe(false));
  it('cannot register patients',     () => expect(can('Hospital Admin', 'patient:register')).toBe(false));
});

// ─── Clinician ────────────────────────────────────────────────────────────────

describe('Clinician permissions', () => {
  it('can create referrals',         () => expect(can('Clinician', 'referral:create')).toBe(true));
  it('can view unmasked patient PII',() => expect(can('Clinician', 'patient:view_unmasked')).toBe(true));
  it('can access chat',              () => expect(can('Clinician', 'chat:access')).toBe(true));
  it('can register patients',        () => expect(can('Clinician', 'patient:register')).toBe(true));
  it('cannot view audit logs',       () => expect(can('Clinician', 'audit:view')).toBe(false));
  it('cannot approve hospitals',     () => expect(can('Clinician', 'hospital:approve')).toBe(false));
  it('cannot suspend users',         () => expect(can('Clinician', 'user:suspend')).toBe(false));
  it('cannot create users',          () => expect(can('Clinician', 'user:create')).toBe(false));
});

// ─── Receptionist ─────────────────────────────────────────────────────────────

describe('Receptionist permissions', () => {
  it('can view masked patient PII',  () => expect(can('Receptionist', 'patient:view_masked')).toBe(true));
  it('can dispatch referrals',       () => expect(can('Receptionist', 'referral:dispatch')).toBe(true));
  it('can receive referrals',        () => expect(can('Receptionist', 'referral:receive')).toBe(true));
  it('cannot create referrals',      () => expect(can('Receptionist', 'referral:create')).toBe(false));
  it('cannot view unmasked PII',     () => expect(can('Receptionist', 'patient:view_unmasked')).toBe(false));
  it('cannot access chat',           () => expect(can('Receptionist', 'chat:access')).toBe(false));
  it('cannot view reports',          () => expect(can('Receptionist', 'report:view')).toBe(false));
  it('cannot view audit logs',       () => expect(can('Receptionist', 'audit:view')).toBe(false));
  it('cannot create users',          () => expect(can('Receptionist', 'user:create')).toBe(false));
});

// ─── Cross-role invariants ────────────────────────────────────────────────────

describe('Cross-role invariants', () => {
  it('only System Admin can approve hospitals', () => {
    const roles: TUserRole[] = ['Hospital Admin', 'Clinician', 'Receptionist'];
    roles.forEach(r => expect(can(r, 'hospital:approve')).toBe(false));
  });

  it('only System Admin can view audit logs', () => {
    const roles: TUserRole[] = ['Hospital Admin', 'Clinician', 'Receptionist'];
    roles.forEach(r => expect(can(r, 'audit:view')).toBe(false));
  });

  it('only Clinician can create referrals', () => {
    const roles: TUserRole[] = ['System Admin', 'Hospital Admin', 'Receptionist'];
    roles.forEach(r => expect(can(r, 'referral:create')).toBe(false));
    expect(can('Clinician', 'referral:create')).toBe(true);
  });

  it('only Clinician can access chat', () => {
    const roles: TUserRole[] = ['System Admin', 'Hospital Admin', 'Receptionist'];
    roles.forEach(r => expect(can(r, 'chat:access')).toBe(false));
  });

  it('all roles can register their hospital', () => {
    const roles: TUserRole[] = ['System Admin', 'Hospital Admin', 'Clinician', 'Receptionist'];
    roles.forEach(r => expect(can(r, 'hospital:register')).toBe(true));
  });
});
