/**
 * FCM Channel — Firebase Cloud Messaging Push Notifications
 *
 * Architecture Contract §1.2, §12.3, §15.1 — Firebase service account
 * credentials (FCM_PROJECT_ID, FCM_PRIVATE_KEY, FCM_CLIENT_EMAIL).
 * §2.4 — FCM is one of the four notification channels in the decision engine.
 *
 * Uses firebase-admin's HTTP v1 API via admin.messaging().
 * Throws ExternalServiceError('FCM', ...) on failure — caught by the
 * BullMQ worker, which handles retry/backoff per Architecture Contract §4.4.
 */

import admin from 'firebase-admin';
import { env } from '../../../config/env.config.js';
import { createModuleLogger } from '../../../config/logger.config.js';
import { ExternalServiceError } from '../../../shared/errors/domain.errors.js';

const logger = createModuleLogger('notifications:fcm');

// ─── Firebase Admin singleton ────────────────────────────────────────────────

let app: admin.app.App | null = null;

function getFirebaseApp(): admin.app.App {
  if (!app) {
    app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: env.FCM_PROJECT_ID,
        clientEmail: env.FCM_CLIENT_EMAIL,
        // Private key from env may contain literal '\n' sequences
        privateKey: env.FCM_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
  }
  return app;
}

// ─── Send result ──────────────────────────────────────────────────────────────

export interface IFcmSendResult {
  /** FCM message ID — stored as `notification_logs.provider_ref`. */
  messageId: string;
  /** Token that failed (if any) — caller may prune dead tokens. */
  invalidToken?: string;
}

/**
 * Sends a push notification to a single FCM registration token.
 *
 * @throws ExternalServiceError('FCM', ...) on send failure.
 * @returns The FCM message ID on success, or marks `invalidToken` if the
 *          token is no longer registered (caller should remove it from
 *          `device_sessions`).
 */
export async function sendFcmPush(params: {
  fcmToken: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}): Promise<IFcmSendResult> {
  try {
    const messaging = getFirebaseApp().messaging();

    const messageId = await messaging.send({
      token: params.fcmToken,
      notification: {
        title: params.title,
        body: params.body,
      },
      data: params.data,
      android: {
        priority: 'high',
      },
      apns: {
        payload: {
          aps: { sound: 'default' },
        },
      },
    });

    logger.debug('FCM push sent', { action: 'FCM_SEND', messageId });
    return { messageId };
  } catch (err: unknown) {
    const code = isFirebaseError(err) ? err.code : undefined;

    // Token no longer valid — caller should prune from device_sessions.
    // Not a retryable failure; do not throw ExternalServiceError for this case.
    if (
      code === 'messaging/registration-token-not-registered' ||
      code === 'messaging/invalid-registration-token'
    ) {
      logger.warn('FCM token invalid — should be pruned', {
        action: 'FCM_TOKEN_INVALID',
        code,
      });
      return { messageId: '', invalidToken: params.fcmToken };
    }

    logger.error('FCM push failed', {
      action: 'FCM_SEND_FAILED',
      errorMessage: err instanceof Error ? err.message : String(err),
      code,
    });
    throw new ExternalServiceError('FCM', 'Firebase Cloud Messaging request failed');
  }
}

/**
 * Sends the same push to multiple FCM tokens (e.g. a user with several
 * devices). Returns per-token results; does not throw for individual
 * invalid tokens — only for total transport failure.
 */
export async function sendFcmPushMulticast(params: {
  fcmTokens: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
}): Promise<IFcmSendResult[]> {
  if (params.fcmTokens.length === 0) return [];

  try {
    const messaging = getFirebaseApp().messaging();

    const response = await messaging.sendEachForMulticast({
      tokens: params.fcmTokens,
      notification: {
        title: params.title,
        body: params.body,
      },
      data: params.data,
      android: { priority: 'high' },
      apns: { payload: { aps: { sound: 'default' } } },
    });

    return response.responses.map((res, idx) => {
      if (res.success && res.messageId) {
        return { messageId: res.messageId };
      }

      const code = res.error && isFirebaseError(res.error) ? res.error.code : undefined;
      if (
        code === 'messaging/registration-token-not-registered' ||
        code === 'messaging/invalid-registration-token'
      ) {
        return { messageId: '', invalidToken: params.fcmTokens[idx] };
      }

      return { messageId: '' };
    });
  } catch (err: unknown) {
    logger.error('FCM multicast push failed', {
      action: 'FCM_MULTICAST_FAILED',
      errorMessage: err instanceof Error ? err.message : String(err),
    });
    throw new ExternalServiceError('FCM', 'Firebase Cloud Messaging request failed');
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isFirebaseError(err: unknown): err is { code: string } {
  return typeof err === 'object' && err !== null && 'code' in err && typeof (err as { code: unknown }).code === 'string';
}
