/**
 * Notification Template — REFERRAL_COMPLETED
 *
 * Sent when a referral's treatment cycle is concluded
 * (Accepted → Completed in the referral lifecycle state machine).
 */

export interface IReferralCompletedTemplateData {
  referralCode: string;
  destinationHospitalName: string;
  sourceHospitalName: string;
}

export function renderInApp(data: IReferralCompletedTemplateData): {
  title: string;
  body: string;
} {
  return {
    title: 'Referral Completed',
    body: `Referral ${data.referralCode} has been marked as completed by ${data.destinationHospitalName}.`,
  };
}

export function renderPush(data: IReferralCompletedTemplateData): {
  title: string;
  body: string;
  data: Record<string, string>;
} {
  return {
    title: 'Referral Completed',
    body: `Referral ${data.referralCode} is now complete.`,
    data: {
      type: 'REFERRAL_COMPLETED',
      referralCode: data.referralCode,
    },
  };
}

export function renderSms(data: IReferralCompletedTemplateData): string {
  return `PRMS: Referral ${data.referralCode} has been marked complete by ${data.destinationHospitalName}.`;
}

export function renderEmail(data: IReferralCompletedTemplateData): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `[PRMS] Referral ${data.referralCode} Completed`;

  const text = [
    `Referral ${data.referralCode} has been marked as completed.`,
    ``,
    `Receiving Facility: ${data.destinationHospitalName}`,
    `Originating Facility: ${data.sourceHospitalName}`,
    ``,
    `No further action is required. View the full referral record in the PRMS portal.`,
  ].join('\n');

  const html = `
    <div style="font-family: Arial, sans-serif; color: #1a1a1a;">
      <h2 style="color: #1a9c5b;">Referral Completed</h2>
      <p>Referral <strong>${data.referralCode}</strong> has been marked as completed by <strong>${data.destinationHospitalName}</strong>.</p>
      <p>No further action is required. View the full referral record in the PRMS portal.</p>
      <p style="color: #888; font-size: 12px;">This is an automated message from PRMS Kenya. Do not reply to this email.</p>
    </div>
  `;

  return { subject, html, text };
}
