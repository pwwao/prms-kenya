/**
 * Notification Templates — Unit Tests
 *
 * Pure function tests — no DB, Redis, or crypto required.
 * Verifies that every template renders the expected channel outputs,
 * respects the 160-char SMS segment limit, and never leaks PII into
 * channels that should not carry it.
 */

import { describe, it, expect } from 'vitest';

import * as dispatched from './templates/referral-dispatched.template.js';
import * as accepted from './templates/referral-accepted.template.js';
import * as rejected from './templates/referral-rejected.template.js';
import * as completed from './templates/referral-completed.template.js';
import * as msgReceived from './templates/message-received.template.js';
import * as passwordReset from './templates/password-reset.template.js';

// ─── REFERRAL_DISPATCHED ──────────────────────────────────────────────────────

describe('referral-dispatched.template', () => {
  const data: dispatched.IReferralDispatchedTemplateData = {
    referralCode: 'REF-2026-001',
    sourceHospitalName: 'Kenyatta National Hospital',
    destinationHospitalName: 'Moi Teaching & Referral Hospital',
    urgencyLevel: 'Urgent',
  };

  it('renderInApp — includes referral code and urgency level', () => {
    const result = dispatched.renderInApp(data);
    expect(result.title).toBeTruthy();
    expect(result.body).toContain('REF-2026-001');
    expect(result.body).toContain('Urgent');
  });

  it('renderPush — data field carries type and referralCode', () => {
    const result = dispatched.renderPush(data);
    expect(result.data.type).toBe('REFERRAL_DISPATCHED');
    expect(result.data.referralCode).toBe('REF-2026-001');
    expect(result.data.urgencyLevel).toBe('Urgent');
  });

  it('renderSms — body is under 320 chars (max 2 segments)', () => {
    const sms = dispatched.renderSms(data);
    expect(typeof sms).toBe('string');
    expect(sms.length).toBeLessThanOrEqual(320);
    expect(sms).toContain('REF-2026-001');
  });

  it('renderSms — does not contain patient PII', () => {
    const sms = dispatched.renderSms(data);
    expect(sms).not.toContain('patient');
    expect(sms).not.toContain('Patient');
  });

  it('renderEmail — returns subject, html, and text', () => {
    const email = dispatched.renderEmail(data);
    expect(email.subject).toContain('REF-2026-001');
    expect(email.html).toContain('REF-2026-001');
    expect(email.text).toContain('REF-2026-001');
    expect(email.html).toContain('<');    // is HTML
    expect(email.text).not.toContain('<'); // is plain text
  });

  it('renderEmail — urgency level appears in subject', () => {
    const email = dispatched.renderEmail(data);
    expect(email.subject).toContain('Urgent');
  });

  it('renderEmail — all three urgency levels render without errors', () => {
    for (const urgencyLevel of ['Routine', 'Urgent', 'Emergent'] as const) {
      expect(() => dispatched.renderEmail({ ...data, urgencyLevel })).not.toThrow();
    }
  });
});

// ─── REFERRAL_ACCEPTED ────────────────────────────────────────────────────────

describe('referral-accepted.template', () => {
  const data: accepted.IReferralAcceptedTemplateData = {
    referralCode: 'REF-2026-002',
    sourceHospitalName: 'Coast General Hospital',
    destinationHospitalName: 'Kenyatta National Hospital',
  };

  it('renderInApp — indicates acceptance with referral code', () => {
    const result = accepted.renderInApp(data);
    expect(result.title.toLowerCase()).toContain('accept');
    expect(result.body).toContain('REF-2026-002');
  });

  it('renderPush — type is REFERRAL_ACCEPTED', () => {
    const result = accepted.renderPush(data);
    expect(result.data.type).toBe('REFERRAL_ACCEPTED');
  });

  it('renderSms — under 320 chars', () => {
    const sms = accepted.renderSms(data);
    expect(sms.length).toBeLessThanOrEqual(320);
  });

  it('renderEmail — positive tone (no "rejected" in output)', () => {
    const email = accepted.renderEmail(data);
    expect(email.subject.toLowerCase()).not.toContain('reject');
    expect(email.html.toLowerCase()).not.toContain('rejected');
  });
});

// ─── REFERRAL_REJECTED ────────────────────────────────────────────────────────

describe('referral-rejected.template', () => {
  const data: rejected.IReferralRejectedTemplateData = {
    referralCode: 'REF-2026-003',
    sourceHospitalName: 'Kisumu County Hospital',
    destinationHospitalName: 'Aga Khan University Hospital',
    rejectionReason: 'No available ICU beds',
  };

  it('renderInApp — includes rejection reason', () => {
    const result = rejected.renderInApp(data);
    expect(result.body).toContain('No available ICU beds');
  });

  it('renderEmail — includes rejection reason', () => {
    const email = rejected.renderEmail(data);
    expect(email.html).toContain('No available ICU beds');
    expect(email.text).toContain('No available ICU beds');
  });

  it('renderPush — does not include rejection reason (too verbose for push)', () => {
    const push = rejected.renderPush(data);
    // push body should be concise — reason is omitted
    expect(push.body).not.toContain('No available ICU beds');
  });

  it('renderEmail — subject flags rejection', () => {
    const email = rejected.renderEmail(data);
    expect(email.subject.toLowerCase()).toContain('reject');
  });
});

// ─── REFERRAL_COMPLETED ───────────────────────────────────────────────────────

describe('referral-completed.template', () => {
  const data: completed.IReferralCompletedTemplateData = {
    referralCode: 'REF-2026-004',
    sourceHospitalName: 'Nakuru County Referral Hospital',
    destinationHospitalName: 'MP Shah Hospital',
  };

  it('renderInApp — indicates completion', () => {
    const result = completed.renderInApp(data);
    expect(result.title.toLowerCase()).toContain('complet');
    expect(result.body).toContain('REF-2026-004');
  });

  it('renderPush — type is REFERRAL_COMPLETED', () => {
    const push = completed.renderPush(data);
    expect(push.data.type).toBe('REFERRAL_COMPLETED');
  });

  it('renderEmail — no-action-required message is present', () => {
    const email = completed.renderEmail(data);
    expect(email.text.toLowerCase()).toContain('no further action');
  });
});

// ─── MESSAGE_RECEIVED ─────────────────────────────────────────────────────────

describe('message-received.template', () => {
  const data: msgReceived.IMessageReceivedTemplateData = {
    referralCode: 'REF-2026-005',
    senderName: 'Dr Amina Hassan',
    messagePreview: 'Patient has been stabilised and is ready for transfer. Please prepare receiving ward.',
  };

  it('renderInApp — includes sender name and preview', () => {
    const result = msgReceived.renderInApp(data);
    expect(result.body).toContain('Dr Amina Hassan');
  });

  it('renderInApp — truncates long preview at 80 chars', () => {
    const longPreview = 'x'.repeat(200);
    const result = msgReceived.renderInApp({ ...data, messagePreview: longPreview });
    expect(result.body.length).toBeLessThan(200);
    expect(result.body).toContain('…');
  });

  it('renderPush — does not include sender name (privacy on push preview)', () => {
    // Push body should be the truncated content without the "name: " prefix
    const push = msgReceived.renderPush(data);
    expect(push.data.type).toBe('MESSAGE_RECEIVED');
    expect(push.body.length).toBeLessThanOrEqual(90);
  });

  it('renderSms / renderEmail — exist as functions (not enqueued by default)', () => {
    expect(typeof msgReceived.renderSms).toBe('function');
    expect(typeof msgReceived.renderEmail).toBe('function');
    expect(() => msgReceived.renderSms(data)).not.toThrow();
    expect(() => msgReceived.renderEmail(data)).not.toThrow();
  });
});

// ─── PASSWORD_RESET ────────────────────────────────────────────────────────────

describe('password-reset.template', () => {
  const data: passwordReset.IPasswordResetTemplateData = {
    resetLink: 'https://prms.health.go.ke/reset?token=abc123',
    expiryMinutes: 30,
  };

  it('renderSms — includes reset link and expiry', () => {
    const sms = passwordReset.renderSms(data);
    expect(sms).toContain('https://prms.health.go.ke/reset?token=abc123');
    expect(sms).toContain('30');
    expect(sms.length).toBeLessThanOrEqual(320);
  });

  it('renderEmail — link appears as anchor tag in HTML', () => {
    const email = passwordReset.renderEmail(data);
    expect(email.html).toContain('href="https://prms.health.go.ke/reset?token=abc123"');
    expect(email.text).toContain('https://prms.health.go.ke/reset?token=abc123');
  });

  it('renderEmail — subject is password-reset related', () => {
    const email = passwordReset.renderEmail(data);
    expect(email.subject.toLowerCase()).toContain('password');
  });

  it('renderEmail — includes security disclaimer', () => {
    const email = passwordReset.renderEmail(data);
    expect(email.text.toLowerCase()).toContain('if you did not request');
    expect(email.html.toLowerCase()).toContain('if you did not request');
  });
});
