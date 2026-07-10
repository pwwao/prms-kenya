/**
 * Notifications Worker — BullMQ Processors
 *
 * Architecture Contract §3.2 — `notifications.worker.ts` defines BullMQ
 * processors. §4.4 — async notification dispatch. §2.4 — Notification Flow
 * Architecture:
 *
 *   QUEUE -> WORKER -> {FCM | SMS | Email} -> RETRY{Success?}
 *     -> No (max 3 retries) -> DEADLETTER (manual review)
 *     -> Yes -> Mark Delivered, update DB
 *
 * Retry behaviour is configured on the Queue side (shared/queue/queue.ts:
 * `attempts: 3, backoff: { type: 'exponential', delay: 5000 }`). This file
 * implements the Worker side: processes jobs, calls the channel modules,
 * and records each attempt in `notification_logs` via
 * `NotificationsRepository.logDeliveryAttempt`.
 *
 * BullMQ automatically retries a job that throws, up to `attempts`. After
 * the final failed attempt the job lands in the queue's "failed" set, which
 * `notifications.queue.ts#getDeadLetterJobs` surfaces for manual review.
 *
 * Run as a separate process (recommended) via:
 *   node dist/modules/notifications/notifications.worker.js
 * or in-process during development via `startNotificationWorkers()`.
 */

import { Worker, type Job, type ConnectionOptions } from 'bullmq';
import { env } from '../../config/env.config.js';
import { createModuleLogger } from '../../config/logger.config.js';
import {
  QUEUE_NAMES,
  MAX_DELIVERY_ATTEMPTS,
  type IFcmJobPayload,
  type ISmsJobPayload,
  type IEmailJobPayload,
} from './notifications.queue.js';
import { NotificationsRepository } from './notifications.repository.js';
import { RecipientLookupRepository } from './recipient-lookup.repository.js';
import { sendFcmPush } from './channels/fcm.channel.js';
import { sendSms } from './channels/sms.channel.js';
import { sendEmail } from './channels/email.channel.js';

import * as referralDispatchedTpl from './templates/referral-dispatched.template.js';
import * as referralAcceptedTpl from './templates/referral-accepted.template.js';
import * as referralRejectedTpl from './templates/referral-rejected.template.js';
import * as referralCompletedTpl from './templates/referral-completed.template.js';
import * as userCreatedTpl from './templates/user-created.template.js';

const logger = createModuleLogger('notifications:worker');

const connection: ConnectionOptions = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD || undefined,
};

const repository = new NotificationsRepository();
const recipientLookup = new RecipientLookupRepository();

// ─── Email template registry ───────────────────────────────────────────────────
// Maps `notifications.type` -> the email template's renderEmail function.
// Used by the email worker to render subject/html/text from `templateData`.

type TEmailRenderer = (data: never) => { subject: string; html: string; text: string };

const EMAIL_TEMPLATES: Record<string, TEmailRenderer> = {
  REFERRAL_DISPATCHED: referralDispatchedTpl.renderEmail as TEmailRenderer,
  REFERRAL_ACCEPTED: referralAcceptedTpl.renderEmail as TEmailRenderer,
  REFERRAL_REJECTED: referralRejectedTpl.renderEmail as TEmailRenderer,
  REFERRAL_COMPLETED: referralCompletedTpl.renderEmail as TEmailRenderer,
  USER_CREATED: userCreatedTpl.renderEmail as TEmailRenderer,
};

// ─── FCM Worker ───────────────────────────────────────────────────────────────

async function processFcmJob(job: Job<IFcmJobPayload>): Promise<void> {
  const { notificationId, fcmToken, title, body, data } = job.data;
  const attemptNumber = job.attemptsMade + 1;

  try {
    const result = await sendFcmPush({ fcmToken, title, body, data });

    if (result.invalidToken) {
      // Not a transient failure — log as 'failed' but do not throw (no retry).
      await repository.logDeliveryAttempt({
        notificationId,
        channel: 'push',
        status: 'failed',
        attemptNumber,
        errorMessage: 'FCM token no longer registered',
      });
      logger.warn('Skipping retry for invalid FCM token', {
        action: 'FCM_TOKEN_PRUNE_NEEDED',
        notificationId,
        userId: job.data.userId,
      });
      return;
    }

    await repository.logDeliveryAttempt({
      notificationId,
      channel: 'push',
      status: 'delivered',
      attemptNumber,
      providerRef: result.messageId,
    });
  } catch (err: unknown) {
    await recordFailureAndRethrow(notificationId, 'push', attemptNumber, err);
  }
}

// ─── SMS Worker ───────────────────────────────────────────────────────────────

async function processSmsJob(job: Job<ISmsJobPayload>): Promise<void> {
  const { notificationId, phone, message } = job.data;
  const attemptNumber = job.attemptsMade + 1;

  try {
    const result = await sendSms({ phone, message });

    await repository.logDeliveryAttempt({
      notificationId,
      channel: 'sms',
      status: 'delivered',
      attemptNumber,
      providerRef: result.messageId,
    });
  } catch (err: unknown) {
    await recordFailureAndRethrow(notificationId, 'sms', attemptNumber, err);
  }
}

// ─── Email Worker ─────────────────────────────────────────────────────────────

async function processEmailJob(job: Job<IEmailJobPayload>): Promise<void> {
  const { notificationId, toAddress, toName, subject, templateId, templateData, userId } = job.data;
  const attemptNumber = job.attemptsMade + 1;

  try {
    let html: string;
    let text: string;
    let renderedSubject = subject;

    const renderer = EMAIL_TEMPLATES[templateId];
    if (renderer) {
      const rendered = renderer(templateData as never);
      html = rendered.html;
      text = rendered.text;
      renderedSubject = rendered.subject;
    } else {
      // Fallback for unknown template IDs — send a minimal plaintext email
      // rather than failing the job outright.
      logger.warn('No email template registered for templateId — using plaintext fallback', {
        action: 'EMAIL_TEMPLATE_MISSING',
        templateId,
        notificationId,
      });
      text = JSON.stringify(templateData);
      html = `<pre>${escapeHtml(text)}</pre>`;
    }

    // Defensive: confirm recipient still has this email (handles deleted/
    // changed accounts between enqueue and processing).
    const recipient = await recipientLookup.getRecipient(userId).catch(() => null);
    const finalAddress = recipient?.email ?? toAddress;

    const result = await sendEmail({
      toAddress: finalAddress,
      toName,
      subject: renderedSubject,
      html,
      text,
    });

    await repository.logDeliveryAttempt({
      notificationId,
      channel: 'email',
      status: 'delivered',
      attemptNumber,
      providerRef: result.messageId,
    });
  } catch (err: unknown) {
    await recordFailureAndRethrow(notificationId, 'email', attemptNumber, err);
  }
}

// ─── Shared retry/failure handling ──────────────────────────────────────────────

/**
 * Records a 'failed' delivery attempt. If this was the last allowed attempt
 * (per `MAX_DELIVERY_ATTEMPTS`), the job will land in BullMQ's failed set
 * after this throw — acting as the Dead Letter Queue (§2.4). Otherwise
 * BullMQ retries with exponential backoff (configured in queue.ts).
 */
async function recordFailureAndRethrow(
  notificationId: number,
  channel: 'push' | 'sms' | 'email',
  attemptNumber: number,
  err: unknown,
): Promise<never> {
  const errorMessage = err instanceof Error ? err.message : String(err);

  await repository.logDeliveryAttempt({
    notificationId,
    channel,
    status: 'failed',
    attemptNumber,
    errorMessage,
  });

  if (attemptNumber >= MAX_DELIVERY_ATTEMPTS) {
    logger.error('Notification delivery exhausted retries — moving to dead letter', {
      action: 'NOTIFICATION_DEAD_LETTER',
      notificationId,
      channel,
      attemptNumber,
      errorMessage,
    });
  } else {
    logger.warn('Notification delivery attempt failed — will retry', {
      action: 'NOTIFICATION_RETRY',
      notificationId,
      channel,
      attemptNumber,
      errorMessage,
    });
  }

  throw err; // BullMQ handles retry/backoff/dead-letter based on this throw
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ─── Worker lifecycle ────────────────────────────────────────────────────────────

let fcmWorker: Worker<IFcmJobPayload> | null = null;
let smsWorker: Worker<ISmsJobPayload> | null = null;
let emailWorker: Worker<IEmailJobPayload> | null = null;

/**
 * Starts all three BullMQ workers (FCM, SMS, Email). Safe to call once at
 * process startup — either in the main API process (development) or in a
 * dedicated worker process (production, recommended per §4.4).
 */
export function startNotificationWorkers(): {
  fcmWorker: Worker<IFcmJobPayload>;
  smsWorker: Worker<ISmsJobPayload>;
  emailWorker: Worker<IEmailJobPayload>;
} {
  fcmWorker = new Worker<IFcmJobPayload>(QUEUE_NAMES.FCM, processFcmJob, {
    connection,
    concurrency: 10,
  });

  smsWorker = new Worker<ISmsJobPayload>(QUEUE_NAMES.SMS, processSmsJob, {
    connection,
    concurrency: 5, // lower concurrency — Africa's Talking rate limits
  });

  emailWorker = new Worker<IEmailJobPayload>(QUEUE_NAMES.EMAIL, processEmailJob, {
    connection,
    concurrency: 5,
  });

  for (const [name, worker] of [
    ['fcm', fcmWorker],
    ['sms', smsWorker],
    ['email', emailWorker],
  ] as const) {
    worker.on('completed', (job) => {
      logger.debug('Job completed', { action: 'WORKER_JOB_COMPLETED', queue: name, jobId: job.id });
    });

    worker.on('failed', (job, err) => {
      logger.error('Job failed', {
        action: 'WORKER_JOB_FAILED',
        queue: name,
        jobId: job?.id,
        attemptsMade: job?.attemptsMade,
        errorMessage: err.message,
      });
    });

    worker.on('error', (err) => {
      logger.error('Worker error', { action: 'WORKER_ERROR', queue: name, errorMessage: err.message });
    });
  }

  logger.info('Notification workers started', { action: 'WORKERS_STARTED' });

  return { fcmWorker, smsWorker, emailWorker };
}

/**
 * Gracefully closes all workers. Called during shutdown alongside
 * `closeQueues()`.
 */
export async function closeNotificationWorkers(): Promise<void> {
  await Promise.all([fcmWorker?.close(), smsWorker?.close(), emailWorker?.close()]);
  logger.info('Notification workers closed', { action: 'WORKERS_CLOSED' });
}
