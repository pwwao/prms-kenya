/**
 * Notification Template — REFERRAL_REJECTED
 *
 * Architecture Contract §2.3 — Rejected requires a reason; triggers
 * notification back to the originating facility/Clinician.
 */

export interface IReferralRejectedTemplateData {
  referralCode: string;
  destinationHospitalName: string;
  sourceHospitalName: string;
  rejectionReason: string;
}

export function renderInApp(data: IReferralRejectedTemplateData): {
  title: string;
  body: string;
} {
  return {
    title: 'Referral Rejected',
    body: `Referral ${data.referralCode} was rejected by ${data.destinationHospitalName}. Reason: ${data.rejectionReason}`,
  };
}

export function renderPush(data: IReferralRejectedTemplateData): {
  title: string;
  body: string;
  data: Record<string, string>;
} {
  return {
    title: 'Referral Rejected',
    body: `${data.destinationHospitalName} rejected referral ${data.referralCode}.`,
    data: {
      type: 'REFERRAL_REJECTED',
      referralCode: data.referralCode,
    },
  };
}

export function renderSms(data: IReferralRejectedTemplateData): string {
  return `PRMS: Referral ${data.referralCode} was rejected by ${data.destinationHospitalName}. Login to PRMS for details.`;
}

export function renderEmail(data: IReferralRejectedTemplateData): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `[PRMS] Referral ${data.referralCode} Rejected`;

  const text = [
    `Your referral has been rejected.`,
    ``,
    `Referral Code: ${data.referralCode}`,
    `Rejected by: ${data.destinationHospitalName}`,
    `Originating Facility: ${data.sourceHospitalName}`,
    `Reason: ${data.rejectionReason}`,
    ``,
    `Please log in to the PRMS portal to review and, if appropriate, revise and resubmit the referral.`,
  ].join('\n');

  const html = `
    <div style="font-family: Arial, sans-serif; color: #1a1a1a;">
      <h2 style="color: #d32f2f;">Referral Rejected</h2>
      <p>Referral <strong>${data.referralCode}</strong> was rejected by <strong>${data.destinationHospitalName}</strong>.</p>
      <p><strong>Reason:</strong> ${data.rejectionReason}</p>
      <p>Please log in to the PRMS portal to review and, if appropriate, revise and resubmit the referral.</p>
      <p style="color: #888; font-size: 12px;">This is an automated message from PRMS Kenya. Do not reply to this email.</p>
    </div>
  `;

  return { subject, html, text };
}
