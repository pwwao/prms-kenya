/**
 * Job Queue — BullMQ
 *
 * Architecture Contract §4.4 — BullMQ for async notification dispatch.
 * Queues: notifications:fcm, notifications:sms, notifications:email
 * Workers are registered by the Notification business module team.
 *
 * This file exports typed queue instances for producers (services) to enqueue.
 * Architecture Contract §13.3 — job payload schemas.
 */

import { Queue, type ConnectionOptions } from 'bullmq';
import { env } from '../../config/env.config.js';
import { logger } from '../../config/logger.config.js';

// ─── Redis connection for BullMQ ──────────────────────────────────────────────

const bullConnection: ConnectionOptions = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD || undefined,
};

// ─── Job payload types ────────────────────────────────────────────────────────

export interface IFcmJobPayload {
  userId: number;
  fcmToken: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  notificationId: number;
}

export interface ISmsJobPayload {
  userId: number;
  phone: string;              // E.164 format
  message: string;
  notificationId: number;
}

export interface IEmailJobPayload {
  userId: number;
  toAddress: string;
  toName: string;
  subject: string;
  templateId: string;         // maps to templates in email service
  templateData: Record<string, unknown>;
  notificationId: number;
}

// ─── Queue names ──────────────────────────────────────────────────────────────

export const QUEUE_NAMES = {
  FCM: 'notifications-fcm',
  SMS: 'notifications-sms',
  EMAIL: 'notifications-email',
} as const;

// ─── Queue instances (producers) ─────────────────────────────────────────────

function createQueue<T>(name: string): Queue<T> {
  const q = new Queue<T>(name, {
    connection: bullConnection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 5000 },
    },
  });

  q.on('error', (err: Error) => {
    logger.error('BullMQ queue error', {
      module: 'queue',
      queue: name,
      errorMessage: err.message,
    });
  });

  return q;
}

// Lazy singletons — not initialised until first use
let fcmQueue: Queue<IFcmJobPayload> | null = null;
let smsQueue: Queue<ISmsJobPayload> | null = null;
let emailQueue: Queue<IEmailJobPayload> | null = null;

export function getFcmQueue(): Queue<IFcmJobPayload> {
  return (fcmQueue ??= createQueue<IFcmJobPayload>(QUEUE_NAMES.FCM));
}

export function getSmsQueue(): Queue<ISmsJobPayload> {
  return (smsQueue ??= createQueue<ISmsJobPayload>(QUEUE_NAMES.SMS));
}

export function getEmailQueue(): Queue<IEmailJobPayload> {
  return (emailQueue ??= createQueue<IEmailJobPayload>(QUEUE_NAMES.EMAIL));
}

// ─── Enqueue helpers (used by Notification service) ──────────────────────────

/** Enqueues an FCM push notification job. */
export async function enqueueFcm(payload: IFcmJobPayload): Promise<void> {
  await getFcmQueue().add('send', payload, {
    jobId: `fcm:${payload.notificationId}`,   // dedup by notification ID
  });
  logger.debug('FCM job enqueued', { module: 'queue', notificationId: payload.notificationId });
}

/** Enqueues an SMS job via Africa's Talking. */
export async function enqueueSms(payload: ISmsJobPayload): Promise<void> {
  await getSmsQueue().add('send', payload, {
    jobId: `sms:${payload.notificationId}`,
  });
  logger.debug('SMS job enqueued', { module: 'queue', notificationId: payload.notificationId });
}

/** Enqueues an email job. */
export async function enqueueEmail(payload: IEmailJobPayload): Promise<void> {
  await getEmailQueue().add('send', payload, {
    jobId: `email:${payload.notificationId}`,
  });
  logger.debug('Email job enqueued', { module: 'queue', notificationId: payload.notificationId });
}

/** Gracefully closes all queue connections. Called during shutdown. */
export async function closeQueues(): Promise<void> {
  await Promise.all([
    fcmQueue?.close(),
    smsQueue?.close(),
    emailQueue?.close(),
  ]);
  logger.info('BullMQ queues closed', { module: 'queue' });
}