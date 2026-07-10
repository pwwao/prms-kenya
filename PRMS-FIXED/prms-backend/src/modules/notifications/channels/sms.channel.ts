/**
 * SMS Channel — Africa's Talking Gateway
 *
 * Architecture Contract §1.2, §15.1 — AFRICASTALKING_API_KEY,
 * AFRICASTALKING_USERNAME, AFRICASTALKING_SENDER_ID.
 * §2.4 — SMS is one of the four notification channels in the decision engine.
 *
 * Uses Africa's Talking REST API directly via axios (no SDK dependency).
 * Throws ExternalServiceError('SMS', ...) on failure — caught by the
 * BullMQ worker for retry/backoff per Architecture Contract §4.4.
 */

import axios from 'axios';
import { env, isProduction } from '../../../config/env.config.js';
import { createModuleLogger } from '../../../config/logger.config.js';
import { ExternalServiceError } from '../../../shared/errors/domain.errors.js';

const logger = createModuleLogger('notifications:sms');

// Africa's Talking endpoints differ between sandbox and live
const AT_BASE_URL = isProduction()
  ? 'https://api.africastalking.com/version1/messaging'
  : 'https://api.sandbox.africastalking.com/version1/messaging';

// ─── Response shapes (Africa's Talking API) ──────────────────────────────────

interface IAfricasTalkingRecipient {
  number: string;
  status: string;
  statusCode: number;
  cost: string;
  messageId: string;
}

interface IAfricasTalkingResponse {
  SMSMessageData: {
    Message: string;
    Recipients: IAfricasTalkingRecipient[];
  };
}

export interface ISmsSendResult {
  /** Africa's Talking message ID — stored as `notification_logs.provider_ref`. */
  messageId: string;
  status: string;
  cost: string;
}

/**
 * Sends an SMS via Africa's Talking.
 *
 * @param params.phone   - E.164 format phone number (e.g. +254722000000)
 * @param params.message - SMS body (will be split into 160-char segments by AT)
 * @throws ExternalServiceError('SMS', ...) on transport or API failure.
 */
export async function sendSms(params: { phone: string; message: string }): Promise<ISmsSendResult> {
  try {
    const response = await axios.post<IAfricasTalkingResponse>(
      AT_BASE_URL,
      new URLSearchParams({
        username: env.AFRICASTALKING_USERNAME,
        to: params.phone,
        message: params.message,
        from: env.AFRICASTALKING_SENDER_ID,
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
          apiKey: env.AFRICASTALKING_API_KEY,
        },
        timeout: 10_000,
      },
    );

    const recipients = response.data.SMSMessageData.Recipients;

    if (recipients.length === 0) {
      throw new Error('Africa\'s Talking returned no recipients in response');
    }

    const recipient = recipients[0];

    // statusCode 100/101 = Success/Queued per Africa's Talking docs
    if (recipient.statusCode !== 100 && recipient.statusCode !== 101) {
      logger.warn('SMS delivery rejected by gateway', {
        action: 'SMS_SEND_REJECTED',
        statusCode: recipient.statusCode,
        status: recipient.status,
      });
      throw new Error(`Africa's Talking rejected message: ${recipient.status}`);
    }

    logger.debug('SMS sent', {
      action: 'SMS_SEND',
      messageId: recipient.messageId,
      cost: recipient.cost,
    });

    return {
      messageId: recipient.messageId,
      status: recipient.status,
      cost: recipient.cost,
    };
  } catch (err: unknown) {
    logger.error('SMS send failed', {
      action: 'SMS_SEND_FAILED',
      errorMessage: err instanceof Error ? err.message : String(err),
    });
    throw new ExternalServiceError('SMS', "Africa's Talking SMS request failed");
  }
}
