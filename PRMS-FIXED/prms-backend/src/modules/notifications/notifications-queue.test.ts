/**
 * Notifications Queue / Dead Letter Queue — Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

process.env.DATABASE_ENCRYPTION_KEY = 'a'.repeat(64);
process.env.HASH_SALT = 'b'.repeat(64);

const mockGetFailed = vi.fn();
const mockGetJob = vi.fn();

vi.mock('../../shared/queue/queue.js', () => ({
  QUEUE_NAMES: { FCM: 'notifications:fcm', SMS: 'notifications:sms', EMAIL: 'notifications:email' },
  getFcmQueue: vi.fn(() => ({ getFailed: mockGetFailed, getJob: mockGetJob })),
  getSmsQueue: vi.fn(() => ({ getFailed: mockGetFailed, getJob: mockGetJob })),
  getEmailQueue: vi.fn(() => ({ getFailed: mockGetFailed, getJob: mockGetJob })),
  enqueueFcm: vi.fn(),
  enqueueSms: vi.fn(),
  enqueueEmail: vi.fn(),
  closeQueues: vi.fn(),
}));

import { getDeadLetterJobs, retryDeadLetterJob, MAX_DELIVERY_ATTEMPTS } from './notifications.queue.js';

describe('Notification Queue — Dead Letter helpers', () => {
  beforeEach(() => {
    mockGetFailed.mockReset();
    mockGetJob.mockReset();
  });

  it('returns only jobs that exhausted MAX_DELIVERY_ATTEMPTS', async () => {
    mockGetFailed.mockResolvedValue([
      { id: '1', attemptsMade: MAX_DELIVERY_ATTEMPTS, failedReason: 'timeout', timestamp: 100, data: { notificationId: 1 } },
      { id: '2', attemptsMade: 1, failedReason: 'transient', timestamp: 200, data: { notificationId: 2 } },
    ]);

    const jobs = await getDeadLetterJobs();

    expect(jobs.length).toBeGreaterThan(0);
    expect(jobs.every((j) => j.attemptsMade >= MAX_DELIVERY_ATTEMPTS)).toBe(true);
  });

  it('retryDeadLetterJob returns false when job not found', async () => {
    mockGetJob.mockResolvedValue(undefined);
    const result = await retryDeadLetterJob('fcm', 'missing-job');
    expect(result).toBe(false);
  });

  it('retryDeadLetterJob retries an existing job', async () => {
    const retry = vi.fn().mockResolvedValue(undefined);
    mockGetJob.mockResolvedValue({ retry });

    const result = await retryDeadLetterJob('sms', 'job-1');
    expect(result).toBe(true);
    expect(retry).toHaveBeenCalled();
  });
});
