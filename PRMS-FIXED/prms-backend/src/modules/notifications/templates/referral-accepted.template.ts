/**
 * Notification Template — REFERRAL_ACCEPTED
 *
 * Architecture Contract §2.3 — Accepted triggers:
 *   - FCM push to originating Clinician
 *   - SMS to patient
 *   - Audit log entry (handled by Audit Service)
 */

export interface IReferralAcceptedTemplateData {
  referralCode: string;
  destinationHospitalName: string;
  sourceHospitalName: string;
}

export function renderInApp(data: IReferralAcceptedTemplateData): {
  title: string;
  body: string;
} {
  return {
    title: 'Referral Accepted',
    body: `Referral ${data.referralCode} has been accepted by ${data.destinationHospitalName}.`,
  };
}

export function renderPush(data: IReferralAcceptedTemplateData): {
  title: string;
  body: string;
  data: Record<string, string>;
} {
  return {
    title: 'Referral Accepted',
    body: `${data.destinationHospitalName} has accepted referral ${data.referralCode}.`,
    data: {
      type: 'REFERRAL_ACCEPTED',
      referralCode: data.referralCode,
    },
  };
}

export function renderSms(data: IReferralAcceptedTemplateData): string {
  return `PRMS: Your referral ${data.referralCode} has been accepted by ${data.destinationHospitalName}. Login to PRMS for details.`;
}

export function renderEmail(data: IReferralAcceptedTemplateData): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `[PRMS] Referral ${data.referralCode} Accepted`;

  const text = [
    `Your referral has been accepted.`,
    ``,
    `Referral Code: ${data.referralCode}`,
    `Accepted by: ${data.destinationHospitalName}`,
    `Originating Facility: ${data.sourceHospitalName}`,
    ``,
    `Please log in to the PRMS portal for full details.`,
  ].join('\n');

  const html = `
    <div style="font-family: Arial, sans-serif; color: #1a1a1a;">
      <h2 style="color: #1a9c5b;">Referral Accepted</h2>
      <p>Your referral <strong>${data.referralCode}</strong> has been accepted by <strong>${data.destinationHospitalName}</strong>.</p>
      <p>Please log in to the PRMS portal for full details.</p>
      <p style="color: #888; font-size: 12px;">This is an automated message from PRMS Kenya. Do not reply to this email.</p>
    </div>
  `;

  return { subject, html, text };
}
