/**
 * Notification Template — PASSWORD_RESET
 *
 * Architecture Contract §3.2 lists `password-reset.template.ts` under the
 * notifications module's templates directory. This template renders the
 * password-reset email/SMS content; the Auth Service is responsible for
 * generating the reset token/link and invoking the email/SMS channels
 * (directly or via the Notification Service's enqueue helpers) with this
 * rendered content — no `notifications` row is created for password resets
 * since they are not tied to a `user_id` inbox entry by design (security:
 * avoid leaving a durable in-app record of password reset requests).
 */

export interface IPasswordResetTemplateData {
  resetLink: string;
  expiryMinutes: number;
}

export function renderSms(data: IPasswordResetTemplateData): string {
  return `PRMS: A password reset was requested for your account. This link expires in ${data.expiryMinutes} minutes: ${data.resetLink}. If you did not request this, ignore this message.`;
}

export function renderEmail(data: IPasswordResetTemplateData): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = '[PRMS] Password Reset Request';

  const text = [
    `A password reset was requested for your PRMS account.`,
    ``,
    `Reset your password using the link below. This link expires in ${data.expiryMinutes} minutes.`,
    data.resetLink,
    ``,
    `If you did not request this, you can safely ignore this email — your password will not be changed.`,
  ].join('\n');

  const html = `
    <div style="font-family: Arial, sans-serif; color: #1a1a1a;">
      <h2 style="color: #0b5fff;">Password Reset Request</h2>
      <p>A password reset was requested for your PRMS account.</p>
      <p>
        <a href="${data.resetLink}" style="display: inline-block; padding: 10px 20px; background: #0b5fff; color: #fff; text-decoration: none; border-radius: 4px;">
          Reset Password
        </a>
      </p>
      <p>This link expires in ${data.expiryMinutes} minutes.</p>
      <p>If you did not request this, you can safely ignore this email — your password will not be changed.</p>
      <p style="color: #888; font-size: 12px;">This is an automated message from PRMS Kenya. Do not reply to this email.</p>
    </div>
  `;

  return { subject, html, text };
}
