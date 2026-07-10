/**
 * Email Channel — AWS SES via SMTP
 *
 * Architecture Contract §1.2, §15.1 — SMTP_HOST, SMTP_PORT, SMTP_USER,
 * SMTP_PASSWORD, SMTP_FROM_ADDRESS, SMTP_FROM_NAME (AWS SES SMTP interface).
 * §2.4 — Email is one of the four notification channels in the decision engine.
 *
 * Uses nodemailer over SMTP (AWS SES SMTP endpoint), per the SMTP_* env vars
 * defined in the architecture contract — no AWS SDK dependency required.
 * Throws ExternalServiceError('EMAIL', ...) on failure — caught by the
 * BullMQ worker for retry/backoff per Architecture Contract §4.4.
 */

import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../../../config/env.config.js';
import { createModuleLogger } from '../../../config/logger.config.js';
import { ExternalServiceError } from '../../../shared/errors/domain.errors.js';

const logger = createModuleLogger('notifications:email');

// ─── Transporter singleton ───────────────────────────────────────────────────

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASSWORD,
      },
    });
  }
  return transporter;
}

// ─── Send ─────────────────────────────────────────────────────────────────────

export interface IEmailSendResult {
  /** SES message ID — stored as `notification_logs.provider_ref`. */
  messageId: string;
  /** Recipients that were accepted by the SMTP server. */
  accepted: string[];
  /** Recipients that were rejected. */
  rejected: string[];
}

/**
 * Sends an email via AWS SES SMTP.
 *
 * @throws ExternalServiceError('EMAIL', ...) on send failure.
 */
export async function sendEmail(params: {
  toAddress: string;
  toName: string;
  subject: string;
  html: string;
  text: string;
}): Promise<IEmailSendResult> {
  try {
    const info = await getTransporter().sendMail({
      from: `"${env.SMTP_FROM_NAME}" <${env.SMTP_FROM_ADDRESS}>`,
      to: `"${params.toName}" <${params.toAddress}>`,
      subject: params.subject,
      text: params.text,
      html: params.html,
    });

    logger.debug('Email sent', {
      action: 'EMAIL_SEND',
      messageId: info.messageId,
      accepted: info.accepted.length,
      rejected: info.rejected.length,
    });

    if (info.rejected.length > 0 && info.accepted.length === 0) {
      throw new Error(`All recipients rejected: ${info.rejected.join(', ')}`);
    }

    return {
      messageId: info.messageId,
      accepted: info.accepted as string[],
      rejected: info.rejected as string[],
    };
  } catch (err: unknown) {
    logger.error('Email send failed', {
      action: 'EMAIL_SEND_FAILED',
      errorMessage: err instanceof Error ? err.message : String(err),
    });
    throw new ExternalServiceError('EMAIL', 'SMTP send failed');
  }
}

/**
 * Verifies SMTP connectivity — called during application startup health
 * checks (optional; failures here should not block boot, only log a warning).
 */
export async function verifyEmailTransport(): Promise<void> {
  try {
    await getTransporter().verify();
    logger.info('SMTP transport verified', { action: 'EMAIL_TRANSPORT_VERIFY' });
  } catch (err: unknown) {
    logger.warn('SMTP transport verification failed', {
      action: 'EMAIL_TRANSPORT_VERIFY_FAILED',
      errorMessage: err instanceof Error ? err.message : String(err),
    });
  }
}
