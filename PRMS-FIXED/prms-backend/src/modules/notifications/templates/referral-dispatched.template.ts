/**
 * Notification Template — REFERRAL_DISPATCHED
 *
 * Architecture Contract §2.3 — Dispatched triggers:
 *   - FCM push to receiving facility
 *   - SMS to patient / next of kin
 *   - Audit log entry (handled by Audit Service, not here)
 *
 * Each exported function renders the content for one channel.
 * Templates contain NO PII beyond what is passed in `data` — callers are
 * responsible for decrypting any encrypted fields before invoking these.
 */

export interface IReferralDispatchedTemplateData {
  referralCode: string;
  destinationHospitalName: string;
  sourceHospitalName: string;
  urgencyLevel: 'Routine' | 'Urgent' | 'Emergent';
  patientName?: string; // decrypted by caller; omitted for SMS/push to avoid PII over insecure channels
}

// ─── In-app / Push ──────────────────────────────────────────────────────────────

export function renderInApp(data: IReferralDispatchedTemplateData): {
  title: string;
  body: string;
} {
  return {
    title: 'New Referral Received',
    body: `Referral ${data.referralCode} (${data.urgencyLevel}) has been dispatched from ${data.sourceHospitalName} to ${data.destinationHospitalName}.`,
  };
}

export function renderPush(data: IReferralDispatchedTemplateData): {
  title: string;
  body: string;
  data: Record<string, string>;
} {
  return {
    title: 'New Referral Received',
    body: `Referral ${data.referralCode} (${data.urgencyLevel}) is incoming from ${data.sourceHospitalName}.`,
    data: {
      type: 'REFERRAL_DISPATCHED',
      referralCode: data.referralCode,
      urgencyLevel: data.urgencyLevel,
    },
  };
}

// ─── SMS (Africa's Talking) ──────────────────────────────────────────────────────

/**
 * SMS body must stay concise — Africa's Talking bills per 160-character
 * segment. No patient PII is included by default.
 */
export function renderSms(data: IReferralDispatchedTemplateData): string {
  return `PRMS: Referral ${data.referralCode} (${data.urgencyLevel}) sent from ${data.sourceHospitalName} to ${data.destinationHospitalName}. Login to PRMS to view details.`;
}

// ─── Email (AWS SES via SMTP) ────────────────────────────────────────────────────

export function renderEmail(data: IReferralDispatchedTemplateData): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `[PRMS] New Referral ${data.referralCode} — ${data.urgencyLevel}`;

  const text = [
    `A new referral has been dispatched to your facility.`,
    ``,
    `Referral Code: ${data.referralCode}`,
    `Urgency: ${data.urgencyLevel}`,
    `From: ${data.sourceHospitalName}`,
    `To: ${data.destinationHospitalName}`,
    ``,
    `Please log in to the PRMS portal to review and acknowledge this referral.`,
  ].join('\n');

  const html = `
    <div style="font-family: Arial, sans-serif; color: #1a1a1a;">
      <h2 style="color: #0b5fff;">New Referral Received</h2>
      <p>A new referral has been dispatched to your facility.</p>
      <table style="border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 4px 12px; font-weight: bold;">Referral Code</td><td style="padding: 4px 12px;">${data.referralCode}</td></tr>
        <tr><td style="padding: 4px 12px; font-weight: bold;">Urgency</td><td style="padding: 4px 12px;">${data.urgencyLevel}</td></tr>
        <tr><td style="padding: 4px 12px; font-weight: bold;">From</td><td style="padding: 4px 12px;">${data.sourceHospitalName}</td></tr>
        <tr><td style="padding: 4px 12px; font-weight: bold;">To</td><td style="padding: 4px 12px;">${data.destinationHospitalName}</td></tr>
      </table>
      <p>Please log in to the PRMS portal to review and acknowledge this referral.</p>
      <p style="color: #888; font-size: 12px;">This is an automated message from PRMS Kenya. Do not reply to this email.</p>
    </div>
  `;

  return { subject, html, text };
}
