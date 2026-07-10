/**
 * Notifications Queue
 *
 * Architecture Contract §3.2 — `notifications.queue.ts` defines BullMQ queue
 * definitions for this module. §4.4 — BullMQ for async notification dispatch.
 *
 * The base Queue instances, job payload types, and enqueue helpers
 * (`enqueueFcm`, `enqueueSms`, `enqueueEmail`) are defined in
 * `shared/queue/queue.ts` (platform team). This file re-exports them for
 * convenience within the notifications module and adds notification-specific
 * helpers: in-app dispatch (no queue needed — direct Socket.IO emit) and
 * dead-letter queue (DLQ) inspection.
 *
 * Architecture Contract §2.4 — RETRY -> max 3 retries -> DEADLETTER.
 * BullMQ's `defaultJobOptions.attempts: 3` (set in shared/queue/queue.ts)
 * implements the retry count; failed jobs after 3 attempts remain in the
 * queue's "failed" set, which acts as the DLQ for manual review.
 */

export {
  QUEUE_NAMES,
  getFcmQueue,
  getSmsQueue,
  getEmailQueue,
  enqueueFcm,
  enqueueSms,
  enqueueEmail,
  closeQueues,
  type IFcmJobPayload,
  type ISmsJobPayload,
  type IEmailJobPayload,
} from '../../shared/queue/queue.js';

import { getFcmQueue, getSmsQueue, getEmailQueue } from '../../shared/queue/queue.js';
import { createModuleLogger } from '../../config/logger.config.js';

const logger = createModuleLogger('notifications:queue');

/** Maximum delivery attempts before a job is treated as a dead letter. */
export const MAX_DELIVERY_ATTEMPTS = 3;

// ─── Dead Letter Queue inspection ────────────────────────────────────────────

export interface IDeadLetterJob {
  queue: 'fcm' | 'sms' | 'email';
  jobId: string;
  notificationId: number | undefined;
  attemptsMade: number;
  failedReason: string;
  timestamp: number;
}

/**
 * Returns failed jobs across all three notification queues that have
 * exhausted their retry attempts — used by an admin-facing dead-letter
 * review endpoint (Architecture Contract §2.4 "Dead Letter Queue \n Manual
 * review").
 */
export async function getDeadLetterJobs(limit = 50): Promise<IDeadLetterJob[]> {
  const queues = [
    { name: 'fcm' as const, queue: getFcmQueue() },
    { name: 'sms' as const, queue: getSmsQueue() },
    { name: 'email' as const, queue: getEmailQueue() },
  ];

  const results: IDeadLetterJob[] = [];

  for (const { name, queue } of queues) {
    const failedJobs = await queue.getFailed(0, limit);

    for (const job of failedJobs) {
      if ((job.attemptsMade ?? 0) >= MAX_DELIVERY_ATTEMPTS) {
        results.push({
          queue: name,
          jobId: job.id ?? 'unknown',
          notificationId: (job.data as { notificationId?: number })?.notificationId,
          attemptsMade: job.attemptsMade ?? 0,
          failedReason: job.failedReason ?? 'Unknown error',
          timestamp: job.timestamp,
        });
      }
    }
  }

  return results.sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Retries a specific dead-letter job by removing it and re-adding it with a
 * fresh attempt count. Used by the manual-review admin action.
 */
export async function retryDeadLetterJob(
  queueName: IDeadLetterJob['queue'],
  jobId: string,
): Promise<boolean> {
  const queue =
    queueName === 'fcm' ? getFcmQueue() : queueName === 'sms' ? getSmsQueue() : getEmailQueue();

  const job = await queue.getJob(jobId);
  if (!job) {
    logger.warn('Dead letter job not found for retry', { action: 'DLQ_RETRY_NOT_FOUND', jobId });
    return false;
  }

  await job.retry();
  logger.info('Dead letter job retried', { action: 'DLQ_RETRY', jobId, queue: queueName });
  return true;
}
