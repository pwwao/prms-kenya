/**
 * Notification Template — MESSAGE_RECEIVED
 *
 * Triggered by `MESSAGE_SENT` events from the Chat Service.
 * Architecture Contract §2.4 — chat messages are primarily an in-app /
 * push concern; SMS and email are NOT sent for individual chat messages
 * to avoid notification fatigue and SMS cost. `renderSms`/`renderEmail`
 * are provided for completeness but the worker (see notifications.worker.ts)
 * does not enqueue SMS/EMAIL jobs for this notification type.
 */

export interface IMessageReceivedTemplateData {
  referralCode: string;
  senderName: string; // decrypted by caller before invoking
  messagePreview: string; // truncated, plaintext
}

const PREVIEW_MAX_LENGTH = 80;

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export function renderInApp(data: IMessageReceivedTemplateData): {
  title: string;
  body: string;
} {
  return {
    title: `New message — Referral ${data.referralCode}`,
    body: `${data.senderName}: ${truncate(data.messagePreview, PREVIEW_MAX_LENGTH)}`,
  };
}

export function renderPush(data: IMessageReceivedTemplateData): {
  title: string;
  body: string;
  data: Record<string, string>;
} {
  return {
    title: `New message — ${data.referralCode}`,
    body: truncate(data.messagePreview, PREVIEW_MAX_LENGTH),
    data: {
      type: 'MESSAGE_RECEIVED',
      referralCode: data.referralCode,
    },
  };
}

/** Not enqueued by default — provided for completeness / future use. */
export function renderSms(data: IMessageReceivedTemplateData): string {
  return `PRMS: New message on referral ${data.referralCode} from ${data.senderName}. Login to PRMS to view.`;
}

/** Not enqueued by default — provided for completeness / future use. */
export function renderEmail(data: IMessageReceivedTemplateData): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `[PRMS] New message — Referral ${data.referralCode}`;
  const text = `${data.senderName} sent a new message on referral ${data.referralCode}:\n\n"${truncate(data.messagePreview, PREVIEW_MAX_LENGTH)}"\n\nLog in to PRMS to view the full conversation.`;
  const html = `
    <div style="font-family: Arial, sans-serif; color: #1a1a1a;">
      <h2 style="color: #0b5fff;">New Chat Message</h2>
      <p><strong>${data.senderName}</strong> sent a new message on referral <strong>${data.referralCode}</strong>:</p>
      <blockquote style="border-left: 3px solid #ccc; padding-left: 12px; color: #444;">${truncate(data.messagePreview, PREVIEW_MAX_LENGTH)}</blockquote>
      <p>Log in to PRMS to view the full conversation.</p>
      <p style="color: #888; font-size: 12px;">This is an automated message from PRMS Kenya. Do not reply to this email.</p>
    </div>
  `;

  return { subject, html, text };
}
