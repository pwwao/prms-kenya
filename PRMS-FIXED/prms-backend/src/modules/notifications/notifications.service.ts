/**
 * Notifications Service
 *
 * Architecture Contract §2.4 — Notification Flow Architecture:
 *   Domain Event -> BullMQ Queue -> Worker -> Channel Decision Engine
 *   -> {FCM, SMS, Email, In-App} -> Retry -> Delivered | Dead Letter
 *
 * Architecture Contract §4.1 — Notification Service owns `notifications`,
 * `notification_logs`; consumes ALL domain events; exposes none.
 *
 * This service is the "Channel Decision Engine" + in-app dispatcher. It:
 *   1. Always creates an in-app `notifications` row (system of record).
 *   2. Emits the in-app notification to the user's Socket.IO room.
 *   3. Decides which of FCM/SMS/Email to enqueue based on notification type
 *      and recipient contact info availability.
 *
 * BullMQ workers (notifications.worker.ts) consume the queues and call the
 * channel modules (fcm/sms/email.channel.ts) + record delivery attempts via
 * `logDeliveryAttempt`.
 */

import type { Server as SocketIOServer } from 'socket.io';
import { BaseService } from '../../shared/base.service.js';
import { NotificationsRepository, type INotificationRow, type TNotificationChannel } from './notifications.repository.js';
import { RecipientLookupRepository } from './recipient-lookup.repository.js';
import { decryptNullable } from '../../shared/services/crypto.service.js';
import { SocketRooms } from '../../shared/base.gateway.js';
import { enqueueFcm, enqueueSms, enqueueEmail } from '../../shared/queue/queue.js';
import { NOTIFICATION_TYPES, type TNotificationType } from './notifications.events.js';

import * as referralDispatchedTpl from './templates/referral-dispatched.template.js';
import * as referralAcceptedTpl from './templates/referral-accepted.template.js';
import * as referralRejectedTpl from './templates/referral-rejected.template.js';
import * as referralCompletedTpl from './templates/referral-completed.template.js';
import * as messageReceivedTpl from './templates/message-received.template.js';
import * as userCreatedTpl from './templates/user-created.template.js';

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface INotificationDto {
  id: number;
  type: string;
  title: string;
  body: string;
  payload: Record<string, unknown> | null;
  channel: TNotificationChannel;
  isRead: boolean;
  createdAt: string;
}

export interface IDispatchResult {
  notification: INotificationRow;
  enqueued: TNotificationChannel[];
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class NotificationsService extends BaseService {
  protected readonly moduleName = 'notifications';

  private readonly repository = new NotificationsRepository();
  private readonly recipientLookup = new RecipientLookupRepository();

  /** Socket.IO server instance — set once at bootstrap via `setSocketServer`. */
  private io: SocketIOServer | null = null;

  /**
   * Injects the Socket.IO server for real-time in-app delivery.
   * Called once during server bootstrap, mirroring how `app.set('io', io)`
   * makes the instance available — this keeps the dependency explicit and
   * testable rather than reading off `app`.
   */
  setSocketServer(io: SocketIOServer): void {
    this.io = io;
  }

  // ─── Public API: read inbox ──────────────────────────────────────────────────

  /**
   * GET /api/v1/notifications — Architecture Contract §8.7.
   * Returns paginated notifications for the authenticated user.
   */
  async listForUser(
    userId: number,
    limit: number,
    offset: number,
    unreadOnly = false,
  ): Promise<{ notifications: INotificationDto[]; total: number }> {
    const [rows, total] = await Promise.all([
      this.repository.findByUserId(userId, limit, offset, unreadOnly),
      this.repository.countByUserId(userId, unreadOnly),
    ]);

    return { notifications: rows.map((r) => this.toDto(r)), total };
  }

  /**
   * PATCH /api/v1/notifications/:id/read — Architecture Contract §8.7.
   */
  async markAsRead(id: number, userId: number): Promise<boolean> {
    const updated = await this.repository.markAsRead(id, userId);
    if (updated) {
      this.logMutation('MARK_NOTIFICATION_READ', id, userId);
    }
    return updated;
  }

  async markAllAsRead(userId: number): Promise<number> {
    const count = await this.repository.markAllAsRead(userId);
    this.logMutation('MARK_ALL_NOTIFICATIONS_READ', userId, userId, { count });
    return count;
  }

  /**
   * Returns unread notifications for the `POST /api/v1/sync` endpoint —
   * Architecture Contract §13.3.
   */
  async getUnreadForSync(userId: number, since?: Date): Promise<INotificationDto[]> {
    const rows = await this.repository.findUnreadForSync(userId, since);
    return rows.map((r) => this.toDto(r));
  }

  // ─── Dispatch: Referral lifecycle events ─────────────────────────────────────

  /**
   * REFERRAL_DISPATCHED — notifies the receiving facility's clinicians.
   * Architecture Contract §2.3 — triggers FCM push + SMS to patient/next of
   * kin + audit log (audit handled separately by Audit Service).
   *
   * `recipientUserIds` — resolved by the caller (event consumer) to the set
   * of users at `destinationHospitalId` who should be notified (e.g. all
   * active Clinicians/Hospital Admins at that facility). This service does
   * not query `users` for role/hospital scoping — that belongs to the
   * Hospital/User services.
   */
  async dispatchReferralDispatched(params: {
    recipientUserIds: number[];
    referralCode: string;
    sourceHospitalName: string;
    destinationHospitalName: string;
    urgencyLevel: 'Routine' | 'Urgent' | 'Emergent';
    payload: Record<string, unknown>;
  }): Promise<IDispatchResult[]> {
    const inApp = referralDispatchedTpl.renderInApp(params);
    const push = referralDispatchedTpl.renderPush(params);

    return this.fanOutToUsers(params.recipientUserIds, {
      type: NOTIFICATION_TYPES.REFERRAL_DISPATCHED,
      inApp,
      push,
      payload: params.payload,
      templateData: params.payload,
      // SMS to facility staff is intentionally NOT sent for dispatch events
      // (Architecture Contract §2.3 — SMS goes to "patient / next of kin",
      // which is outside this module's scope and handled by the Referral
      // Service via a dedicated patient-contact flow). Facility staff
      // receive in-app + push only.
      includeSms: false,
      includeEmail: true,
    });
  }

  /**
   * REFERRAL_ACCEPTED — notifies the originating facility's clinicians.
   */
  async dispatchReferralAccepted(params: {
    recipientUserIds: number[];
    referralCode: string;
    sourceHospitalName: string;
    destinationHospitalName: string;
    payload: Record<string, unknown>;
  }): Promise<IDispatchResult[]> {
    const inApp = referralAcceptedTpl.renderInApp(params);
    const push = referralAcceptedTpl.renderPush(params);

    return this.fanOutToUsers(params.recipientUserIds, {
      type: NOTIFICATION_TYPES.REFERRAL_ACCEPTED,
      inApp,
      push,
      payload: params.payload,
      templateData: params.payload,
      includeSms: false,
      includeEmail: true,
    });
  }

  /**
   * REFERRAL_REJECTED — notifies the originating facility's clinicians.
   */
  async dispatchReferralRejected(params: {
    recipientUserIds: number[];
    referralCode: string;
    sourceHospitalName: string;
    destinationHospitalName: string;
    rejectionReason: string;
    payload: Record<string, unknown>;
  }): Promise<IDispatchResult[]> {
    const inApp = referralRejectedTpl.renderInApp(params);
    const push = referralRejectedTpl.renderPush(params);

    return this.fanOutToUsers(params.recipientUserIds, {
      type: NOTIFICATION_TYPES.REFERRAL_REJECTED,
      inApp,
      push,
      payload: params.payload,
      templateData: params.payload,
      includeSms: false,
      includeEmail: true,
    });
  }

  /**
   * REFERRAL_COMPLETED — notifies relevant clinicians at both facilities.
   */
  async dispatchReferralCompleted(params: {
    recipientUserIds: number[];
    referralCode: string;
    sourceHospitalName: string;
    destinationHospitalName: string;
    payload: Record<string, unknown>;
  }): Promise<IDispatchResult[]> {
    const inApp = referralCompletedTpl.renderInApp(params);
    const push = referralCompletedTpl.renderPush(params);

    return this.fanOutToUsers(params.recipientUserIds, {
      type: NOTIFICATION_TYPES.REFERRAL_COMPLETED,
      inApp,
      push,
      payload: params.payload,
      templateData: params.payload,
      includeSms: false,
      includeEmail: false,
    });
  }

  // ─── Dispatch: Chat events ────────────────────────────────────────────────────

  /**
   * MESSAGE_SENT — notifies the *other* participant(s) of a referral chat.
   * Architecture Contract §13.4 — chat is real-time; this provides a
   * fallback in-app/push notification for users not currently viewing the
   * chat (e.g. app in background).
   *
   * `senderFullNameEncrypted` is decrypted here (Service layer only, per
   * §9.5) for use in the template — never persisted in plaintext.
   */
  async dispatchMessageReceived(params: {
    recipientUserIds: number[];
    referralCode: string;
    senderFullNameEncrypted: string | null;
    messagePreview: string;
    payload: Record<string, unknown>;
  }): Promise<IDispatchResult[]> {
    const senderName = decryptNullable(params.senderFullNameEncrypted) ?? 'A colleague';

    const inApp = messageReceivedTpl.renderInApp({
      referralCode: params.referralCode,
      senderName,
      messagePreview: params.messagePreview,
    });
    const push = messageReceivedTpl.renderPush({
      referralCode: params.referralCode,
      senderName,
      messagePreview: params.messagePreview,
    });

    return this.fanOutToUsers(params.recipientUserIds, {
      type: NOTIFICATION_TYPES.MESSAGE_RECEIVED,
      inApp,
      push,
      payload: params.payload,
      templateData: params.payload,
      // Per Architecture Contract §2.4 cost considerations — no SMS/email
      // for individual chat messages.
      includeSms: false,
      includeEmail: false,
    });
  }

  async dispatchUserCreated(params: {
    recipientUserIds: number[];
    role: 'System Admin' | 'Hospital Admin' | 'Clinician' | 'Receptionist';
    hospitalName?: string | null;
    loginUrl: string;
    temporaryPassword: string;
    payload: Record<string, unknown>;
  }): Promise<IDispatchResult[]> {
    const inApp = userCreatedTpl.renderInApp({
      role: params.role,
      hospitalName: params.hospitalName ?? null,
      loginUrl: params.loginUrl,
      temporaryPassword: params.temporaryPassword,
    });
    const push = userCreatedTpl.renderPush({
      role: params.role,
      hospitalName: params.hospitalName ?? null,
      loginUrl: params.loginUrl,
      temporaryPassword: params.temporaryPassword,
    });

    return this.fanOutToUsers(params.recipientUserIds, {
      type: NOTIFICATION_TYPES.USER_CREATED,
      inApp,
      push,
      payload: params.payload,
      templateData: {
        role: params.role,
        hospitalName: params.hospitalName ?? null,
        loginUrl: params.loginUrl,
        temporaryPassword: params.temporaryPassword,
      },
      includeSms: false,
      includeEmail: true,
    });
  }

  // ─── Core fan-out / channel decision engine ──────────────────────────────────

  /**
   * For each recipient user:
   *   1. Creates an in-app `notifications` row (system of record).
   *   2. Emits it over Socket.IO to `user:{id}` room (real-time inbox update).
   *   3. Enqueues FCM push if the user has registered device tokens.
   *   4. Optionally enqueues SMS (if `includeSms` and user has a phone).
   *   5. Optionally enqueues Email (if `includeEmail` and user has an email).
   *
   * Failures resolving any single recipient's contact info are logged and
   * skipped — they do not abort the fan-out to other recipients.
   */
  private async fanOutToUsers(
    userIds: number[],
    opts: {
      type: TNotificationType;
      inApp: { title: string; body: string };
      push: { title: string; body: string; data: Record<string, string> };
      payload: Record<string, unknown>;
      templateData: Record<string, unknown>;
      includeSms: boolean;
      includeEmail: boolean;
    },
  ): Promise<IDispatchResult[]> {
    const results: IDispatchResult[] = [];

    for (const userId of userIds) {
      try {
        const result = await this.dispatchToUser(userId, opts);
        results.push(result);
      } catch (err: unknown) {
        this.logger.error('Failed to dispatch notification to user', {
          action: 'NOTIFICATION_DISPATCH_FAILED',
          userId,
          type: opts.type,
          errorMessage: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return results;
  }

  private async dispatchToUser(
    userId: number,
    opts: {
      type: TNotificationType;
      inApp: { title: string; body: string };
      push: { title: string; body: string; data: Record<string, string> };
      payload: Record<string, unknown>;
      templateData: Record<string, unknown>;
      includeSms: boolean;
      includeEmail: boolean;
    },
  ): Promise<IDispatchResult> {
    // 1. Persist in-app notification (system of record for all channels)
    const notification = await this.repository.create({
      userId,
      type: opts.type,
      title: opts.inApp.title,
      body: opts.inApp.body,
      payloadJson: opts.payload,
      channel: 'in_app',
    });

    this.logMutation('CREATE_NOTIFICATION', notification.id, userId, { type: opts.type });

    // 2. Real-time delivery to the user's inbox room
    this.emitInApp(userId, notification);

    const enqueued: TNotificationChannel[] = [];

    // 3. FCM push — enqueue per registered device token
    const deviceTokens = await this.recipientLookup.getFcmTokens(userId);
    for (const device of deviceTokens) {
      if (!device.fcm_token) continue;
      await enqueueFcm({
        userId,
        fcmToken: device.fcm_token,
        title: opts.push.title,
        body: opts.push.body,
        data: opts.push.data,
        notificationId: notification.id,
      });
      enqueued.push('push');
    }

    // 4 & 5. SMS / Email — only if requested and recipient has contact info
    if (opts.includeSms || opts.includeEmail) {
      const recipient = await this.recipientLookup.getRecipient(userId);

      if (opts.includeSms && recipient.phone_number) {
        await enqueueSms({
          userId,
          phone: recipient.phone_number,
          message: opts.inApp.body,
          notificationId: notification.id,
        });
        enqueued.push('sms');
      }

      if (opts.includeEmail && recipient.email) {
        const fullName = decryptNullable(recipient.full_name_encrypted) ?? recipient.email;
        await enqueueEmail({
          userId,
          toAddress: recipient.email,
          toName: fullName,
          subject: opts.inApp.title,
          templateId: opts.type,
          templateData: opts.templateData,
          notificationId: notification.id,
        });
        enqueued.push('email');
      }
    }

    return { notification, enqueued };
  }

  /**
   * Emits a real-time `NOTIFICATION_NEW` event to the user's private room.
   * Architecture Contract §13.2 — room naming `user:{id}`.
   * Mirrors the chat `/chat` namespace pattern but on the root namespace,
   * since notifications are cross-cutting (not referral-scoped).
   */
  private emitInApp(userId: number, notification: INotificationRow): void {
    if (!this.io) {
      this.logger.warn('Socket.IO not configured — skipping real-time notification', {
        action: 'NOTIFICATION_SOCKET_SKIPPED',
        userId,
      });
      return;
    }

    this.io.to(SocketRooms.user(userId)).emit('NOTIFICATION_NEW', this.toDto(notification));
  }

  // ─── Mapping ────────────────────────────────────────────────────────────────

  private toDto(row: INotificationRow): INotificationDto {
    let payload: Record<string, unknown> | null = null;
    if (row.payload_json) {
      try {
        payload = JSON.parse(row.payload_json) as Record<string, unknown>;
      } catch {
        payload = null;
      }
    }

    return {
      id: row.id,
      type: row.type,
      title: row.title,
      body: row.body,
      payload,
      channel: row.channel,
      isRead: row.is_read === 1,
      createdAt: row.created_at.toISOString(),
    };
  }
}
