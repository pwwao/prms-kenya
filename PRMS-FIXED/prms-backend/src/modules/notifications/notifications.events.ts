/**
 * Notification Domain Event Schemas
 *
 * Architecture Contract §13.1 — Domain Event Schema (envelope).
 * §4.1 — Notification Service "Consumes Events: All domain events".
 *
 * Defines the typed payload shapes for every domain event the Notification
 * Service subscribes to via Redis Pub/Sub (`events:{EVENT_TYPE}` channels),
 * and maps each event type to the notification `type` value stored in
 * `notifications.type`.
 *
 * These are PAYLOAD types only — the outer envelope
 * ({ eventId, eventType, occurredAt, version, payload }) is defined in
 * shared/base.service.ts (`IDomainEvent<T>`) and reused here.
 */

import type { IDomainEvent } from '../../shared/base.service.js';

// ─── Referral Service events ───────────────────────────────────────────────────

export interface IReferralDispatchedPayload {
  referralId: number;
  referralCode: string;
  patientId: number;
  sourceHospitalId: number;
  destinationHospitalId: number;
  urgencyLevel: 'Routine' | 'Urgent' | 'Emergent';
  triggeredByUserId: number;
}

export interface IReferralAcceptedPayload {
  referralId: number;
  referralCode: string;
  patientId: number;
  sourceHospitalId: number;
  destinationHospitalId: number;
  triggeredByUserId: number;
}

export interface IReferralRejectedPayload {
  referralId: number;
  referralCode: string;
  patientId: number;
  sourceHospitalId: number;
  destinationHospitalId: number;
  rejectionReason: string;
  triggeredByUserId: number;
}

export interface IReferralCompletedPayload {
  referralId: number;
  referralCode: string;
  patientId: number;
  sourceHospitalId: number;
  destinationHospitalId: number;
  triggeredByUserId: number;
}

// ─── Chat Service events ────────────────────────────────────────────────────────

export interface IMessageSentPayload {
  messageId: number;
  referralId: number;
  senderId: number;
  senderRole: string;
  content: string;
  createdAt: string;
}

// ─── Auth Service events ────────────────────────────────────────────────────────

export interface IUserLoggedInPayload {
  userId: number;
  deviceId?: string;
  ipAddress?: string;
}

export interface IUserLoggedOutPayload {
  userId: number;
  jti: string;
}

export interface IUserCreatedPayload {
  userId: number;
  role: 'System Admin' | 'Hospital Admin' | 'Clinician' | 'Receptionist';
  hospitalId: number | null;
  temporaryPassword: string;
  loginUrl: string;
}

// ─── Hospital Service events ─────────────────────────────────────────────────────

export interface IHospitalApprovedPayload {
  hospitalId: number;
  approvedByUserId: number;
}

export interface IHospitalSuspendedPayload {
  hospitalId: number;
  suspendedByUserId: number;
  reason?: string;
}

// ─── Patient Service events ──────────────────────────────────────────────────────

export interface IPatientRegisteredPayload {
  patientId: number;
  registeredByUserId: number;
  hospitalId: number;
}

// ─── Event type registry ────────────────────────────────────────────────────────

/**
 * Maps each Redis Pub/Sub event type to its payload shape and the Redis
 * channel name (`events:{EVENT_TYPE}`) it is published on.
 * Architecture Contract §13.1.
 */
export interface IDomainEventPayloadMap {
  REFERRAL_DISPATCHED: IReferralDispatchedPayload;
  REFERRAL_ACCEPTED: IReferralAcceptedPayload;
  REFERRAL_REJECTED: IReferralRejectedPayload;
  REFERRAL_COMPLETED: IReferralCompletedPayload;
  MESSAGE_SENT: IMessageSentPayload;
  USER_CREATED: IUserCreatedPayload;
  USER_LOGGED_IN: IUserLoggedInPayload;
  USER_LOGGED_OUT: IUserLoggedOutPayload;
  HOSPITAL_APPROVED: IHospitalApprovedPayload;
  HOSPITAL_SUSPENDED: IHospitalSuspendedPayload;
  PATIENT_REGISTERED: IPatientRegisteredPayload;
}

export type TDomainEventType = keyof IDomainEventPayloadMap;

/** Typed domain event for a specific event type. */
export type TDomainEvent<K extends TDomainEventType> = IDomainEvent<IDomainEventPayloadMap[K]>;

/** Returns the Redis Pub/Sub channel name for an event type — Architecture Contract §13.1. */
export function eventChannel(eventType: TDomainEventType): string {
  return `events:${eventType}`;
}

/**
 * Notification `type` values (stored in `notifications.type`).
 * One-to-one with the domain event types that trigger them, except where
 * a single event fans out to multiple notification types (none currently).
 */
export const NOTIFICATION_TYPES = {
  REFERRAL_DISPATCHED: 'REFERRAL_DISPATCHED',
  REFERRAL_ACCEPTED: 'REFERRAL_ACCEPTED',
  REFERRAL_REJECTED: 'REFERRAL_REJECTED',
  REFERRAL_COMPLETED: 'REFERRAL_COMPLETED',
  MESSAGE_RECEIVED: 'MESSAGE_RECEIVED',
  USER_CREATED: 'USER_CREATED',
} as const;

export type TNotificationType = (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];

/** All event types the Notification Service subscribes to. */
export const SUBSCRIBED_EVENT_TYPES: TDomainEventType[] = [
  'REFERRAL_DISPATCHED',
  'REFERRAL_ACCEPTED',
  'REFERRAL_REJECTED',
  'REFERRAL_COMPLETED',
  'MESSAGE_SENT',
  'USER_CREATED',
];
