/**
 * Notifications Event Subscriber
 *
 * Architecture Contract §4.1 — Notification Service "Consumes Events: All
 * domain events" via Redis Pub/Sub. §13.1 — Domain Event Schema.
 *
 * Subscribes to `events:{EVENT_TYPE}` channels on the dedicated Redis
 * subscriber client (`getRedisSubClient`) and routes each event to the
 * appropriate `NotificationsService.dispatch*` method.
 *
 * IMPORTANT — Cross-module data resolution:
 * Domain event payloads (§13.1) carry IDs (referralId, sourceHospitalId,
 * destinationHospitalId, etc.) but not display names or recipient user
 * lists — those live in tables owned by other services (`hospitals`,
 * `users`, `referrals`). Per §4.1 "No service may directly query another
 * service's database tables", this subscriber depends on an injected
 * `IEventContextResolver` — implemented by the Hospital/User/Referral teams
 * (or a shared read-model) — to resolve those fields. A safe no-op default
 * resolver is provided so this module compiles and runs standalone; wire in
 * the real resolver at bootstrap.
 */

import { getRedisSubClient } from '../../config/redis.config.js';
import { createModuleLogger } from '../../config/logger.config.js';
import { NotificationsService } from './notifications.service.js';
import {
  eventChannel,
  SUBSCRIBED_EVENT_TYPES,
  type TDomainEvent,
  type TDomainEventType,
  type IReferralDispatchedPayload,
  type IReferralAcceptedPayload,
  type IReferralRejectedPayload,
  type IReferralCompletedPayload,
  type IMessageSentPayload,
  type IUserCreatedPayload,
} from './notifications.events.js';

const logger = createModuleLogger('notifications:subscriber');

// ─── Context resolver contract ────────────────────────────────────────────────

/**
 * Resolves cross-service display data needed to render notification
 * templates. Implemented by composing read access to Hospital/User/Referral
 * repositories at the application bootstrap layer (server.ts), kept
 * out of this module to respect service boundaries (§4.1, §4.2).
 */
export interface IEventContextResolver {
  /** Human-readable hospital name for a hospital ID. */
  getHospitalName(hospitalId: number): Promise<string>;

  /**
   * Returns the user IDs that should be notified for a referral event at
   * the given hospital (e.g. all active Clinicians/Hospital Admins at that
   * facility).
   */
  getNotifiableUsersForHospital(hospitalId: number): Promise<number[]>;

  /**
   * Returns the other participant(s) in a referral chat (i.e. everyone
   * except `excludeUserId`) who should receive a MESSAGE_RECEIVED notice.
   */
  getChatParticipants(referralId: number, excludeUserId: number): Promise<number[]>;

  /** Returns the encrypted full name for a user, or null if unavailable. */
  getUserFullNameEncrypted(userId: number): Promise<string | null>;
}

/**
 * No-op default resolver — logs and returns empty results. Allows this
 * module to be imported/started without the cross-service wiring in place.
 * MUST be replaced via `registerNotificationSubscriptions(service, resolver)`
 * in server.ts once the Hospital/User/Referral modules are available.
 */
export const noopEventContextResolver: IEventContextResolver = {
  async getHospitalName(hospitalId: number): Promise<string> {
    logger.warn('noopEventContextResolver.getHospitalName called — wire up real resolver', {
      action: 'RESOLVER_NOOP',
      hospitalId,
    });
    return `Hospital #${hospitalId}`;
  },
  async getNotifiableUsersForHospital(): Promise<number[]> {
    return [];
  },
  async getChatParticipants(): Promise<number[]> {
    return [];
  },
  async getUserFullNameEncrypted(): Promise<string | null> {
    return null;
  },
};

// ─── Subscriber ───────────────────────────────────────────────────────────────

/**
 * Subscribes to all domain event channels consumed by the Notification
 * Service and wires them to `NotificationsService` dispatch methods.
 *
 * @example
 * // In server.ts, after Socket.IO init:
 * const notificationsService = new NotificationsService();
 * notificationsService.setSocketServer(io);
 * registerNotificationSubscriptions(notificationsService, realResolver);
 */
export function registerNotificationSubscriptions(
  notificationsService: NotificationsService,
  resolver: IEventContextResolver = noopEventContextResolver,
): void {
  const sub = getRedisSubClient();

  const channels = SUBSCRIBED_EVENT_TYPES.map(eventChannel);

  sub.subscribe(...channels, (err, count) => {
    if (err) {
      logger.error('Failed to subscribe to domain event channels', {
        action: 'SUBSCRIBE_FAILED',
        errorMessage: err.message,
      });
      return;
    }
    logger.info('Subscribed to domain event channels', {
      action: 'SUBSCRIBED',
      channelCount: count,
      channels,
    });
  });

  sub.on('message', (channel: string, message: string) => {
    void handleMessage(channel, message, notificationsService, resolver);
  });
}

async function handleMessage(
  channel: string,
  message: string,
  notificationsService: NotificationsService,
  resolver: IEventContextResolver,
): Promise<void> {
  let event: TDomainEvent<TDomainEventType>;

  try {
    event = JSON.parse(message) as TDomainEvent<TDomainEventType>;
  } catch (err) {
    logger.error('Failed to parse domain event message', {
      action: 'EVENT_PARSE_FAILED',
      channel,
      errorMessage: err instanceof Error ? err.message : String(err),
    });
    return;
  }

  try {
    switch (event.eventType) {
      case 'REFERRAL_DISPATCHED':
        await handleReferralDispatched(
          event.payload as IReferralDispatchedPayload,
          notificationsService,
          resolver,
        );
        break;

      case 'REFERRAL_ACCEPTED':
        await handleReferralAccepted(
          event.payload as IReferralAcceptedPayload,
          notificationsService,
          resolver,
        );
        break;

      case 'USER_CREATED':
        await handleUserCreated(
          event.payload as IUserCreatedPayload,
          notificationsService,
          resolver,
        );
        break;

      case 'REFERRAL_REJECTED':
        await handleReferralRejected(
          event.payload as IReferralRejectedPayload,
          notificationsService,
          resolver,
        );
        break;

      case 'REFERRAL_COMPLETED':
        await handleReferralCompleted(
          event.payload as IReferralCompletedPayload,
          notificationsService,
          resolver,
        );
        break;

      case 'MESSAGE_SENT':
        await handleMessageSent(
          event.payload as IMessageSentPayload,
          notificationsService,
          resolver,
        );
        break;

      default:
        logger.debug('Ignoring unhandled event type', {
          action: 'EVENT_IGNORED',
          eventType: event.eventType,
        });
    }
  } catch (err: unknown) {
    logger.error('Error handling domain event', {
      action: 'EVENT_HANDLER_ERROR',
      eventType: event.eventType,
      eventId: event.eventId,
      errorMessage: err instanceof Error ? err.message : String(err),
    });
  }
}

// ─── Event handlers ─────────────────────────────────────────────────────────────

async function handleReferralDispatched(
  payload: IReferralDispatchedPayload,
  service: NotificationsService,
  resolver: IEventContextResolver,
): Promise<void> {
  const [sourceHospitalName, destinationHospitalName, recipientUserIds] = await Promise.all([
    resolver.getHospitalName(payload.sourceHospitalId),
    resolver.getHospitalName(payload.destinationHospitalId),
    resolver.getNotifiableUsersForHospital(payload.destinationHospitalId),
  ]);

  await service.dispatchReferralDispatched({
    recipientUserIds,
    referralCode: payload.referralCode,
    sourceHospitalName,
    destinationHospitalName,
    urgencyLevel: payload.urgencyLevel,
    payload: { referralId: payload.referralId, referralCode: payload.referralCode },
  });
}

async function handleReferralAccepted(
  payload: IReferralAcceptedPayload,
  service: NotificationsService,
  resolver: IEventContextResolver,
): Promise<void> {
  const [sourceHospitalName, destinationHospitalName, recipientUserIds] = await Promise.all([
    resolver.getHospitalName(payload.sourceHospitalId),
    resolver.getHospitalName(payload.destinationHospitalId),
    resolver.getNotifiableUsersForHospital(payload.sourceHospitalId),
  ]);

  await service.dispatchReferralAccepted({
    recipientUserIds,
    referralCode: payload.referralCode,
    sourceHospitalName,
    destinationHospitalName,
    payload: { referralId: payload.referralId, referralCode: payload.referralCode },
  });
}

async function handleReferralRejected(
  payload: IReferralRejectedPayload,
  service: NotificationsService,
  resolver: IEventContextResolver,
): Promise<void> {
  const [sourceHospitalName, destinationHospitalName, recipientUserIds] = await Promise.all([
    resolver.getHospitalName(payload.sourceHospitalId),
    resolver.getHospitalName(payload.destinationHospitalId),
    resolver.getNotifiableUsersForHospital(payload.sourceHospitalId),
  ]);

  await service.dispatchReferralRejected({
    recipientUserIds,
    referralCode: payload.referralCode,
    sourceHospitalName,
    destinationHospitalName,
    rejectionReason: payload.rejectionReason,
    payload: { referralId: payload.referralId, referralCode: payload.referralCode },
  });
}

async function handleReferralCompleted(
  payload: IReferralCompletedPayload,
  service: NotificationsService,
  resolver: IEventContextResolver,
): Promise<void> {
  const [sourceHospitalName, destinationHospitalName, sourceUsers, destUsers] = await Promise.all([
    resolver.getHospitalName(payload.sourceHospitalId),
    resolver.getHospitalName(payload.destinationHospitalId),
    resolver.getNotifiableUsersForHospital(payload.sourceHospitalId),
    resolver.getNotifiableUsersForHospital(payload.destinationHospitalId),
  ]);

  await service.dispatchReferralCompleted({
    recipientUserIds: [...new Set([...sourceUsers, ...destUsers])],
    referralCode: payload.referralCode,
    sourceHospitalName,
    destinationHospitalName,
    payload: { referralId: payload.referralId, referralCode: payload.referralCode },
  });
}

async function handleMessageSent(
  payload: IMessageSentPayload,
  service: NotificationsService,
  resolver: IEventContextResolver,
): Promise<void> {
  const [recipientUserIds, senderFullNameEncrypted] = await Promise.all([
    resolver.getChatParticipants(payload.referralId, payload.senderId),
    resolver.getUserFullNameEncrypted(payload.senderId),
  ]);

  if (recipientUserIds.length === 0) return;

  await service.dispatchMessageReceived({
    recipientUserIds,
    referralCode: `REF-${payload.referralId}`,
    senderFullNameEncrypted,
    messagePreview: payload.content,
    payload: { referralId: payload.referralId, messageId: payload.messageId },
  });
}

async function handleUserCreated(
  payload: IUserCreatedPayload,
  service: NotificationsService,
  resolver: IEventContextResolver,
): Promise<void> {
  const hospitalName = payload.hospitalId !== null
    ? await resolver.getHospitalName(payload.hospitalId)
    : null;

  await service.dispatchUserCreated({
    recipientUserIds: [payload.userId],
    role: payload.role,
    hospitalName,
    loginUrl: payload.loginUrl,
    temporaryPassword: payload.temporaryPassword,
    payload: {
      userId: payload.userId,
      role: payload.role,
      hospitalId: payload.hospitalId,
    },
  });
}
