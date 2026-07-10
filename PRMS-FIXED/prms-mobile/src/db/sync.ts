/**
 * PRMS Sync Engine
 * Integrates with POST /sync endpoint per API Reference Module 10.
 * Pulls server changes into WatermelonDB, pushes pending local mutations.
 */
import { database, collections } from './database';
import { syncApi } from '@api/services';
import { syncStorage, deviceStorage } from '@utils/tokenStorage';
import { generateLocalId } from '@utils/helpers';
import type {
  Referral,
  Patient,
  AppNotification,
  CreatePatientRequest,
  CreateReferralRequest,
  UpdateReferralStatusRequest,
} from '@types/index';
import { patientsApi, referralsApi } from '@api/services';

// ─── Pull: server → local ─────────────────────────────────────────────────────

async function applyServerReferrals(referrals: Partial<Referral>[]): Promise<void> {
  if (referrals.length === 0) return;

  await database.write(async () => {
    for (const ref of referrals) {
      if (!ref.id) continue;

      const existing = await collections.referrals
        .query()
        .then((all) => all.find((r) => r.serverId === ref.id));

      if (existing) {
        await existing.update((r) => {
          if (ref.status) r.status = ref.status;
          if (ref.urgencyLevel) r.urgencyLevel = ref.urgencyLevel;
          if (ref.referralCode) r.referralCode = ref.referralCode;
          if (ref.updatedAt) r.updatedAtServer = ref.updatedAt;
          r.updatedAtLocal = Date.now();
          r.syncStatus = 'synced';
        });
      } else {
        await collections.referrals.create((r) => {
          r.serverId = ref.id!;
          r.referralCode = ref.referralCode ?? '';
          r.status = ref.status ?? 'Draft';
          r.urgencyLevel = ref.urgencyLevel ?? 'Routine';
          r.direction = ref.direction ?? '';
          r.patientDisplayName =
            typeof ref.patient === 'object' && 'displayName' in ref.patient
              ? (ref.patient as { displayName: string }).displayName
              : '';
          r.sourceHospitalName = ref.sourceHospital?.name ?? '';
          r.destHospitalName = ref.destinationHospital?.name ?? '';
          r.createdAtServer = ref.createdAt ?? '';
          r.updatedAtServer = ref.updatedAt ?? '';
          r.updatedAtLocal = Date.now();
          r.syncStatus = 'synced';
        });
      }
    }
  });
}

async function applyServerNotifications(notifications: Partial<AppNotification>[]): Promise<void> {
  if (notifications.length === 0) return;

  await database.write(async () => {
    for (const notif of notifications) {
      if (!notif.id) continue;

      const existing = await collections.notifications
        .query()
        .then((all) => all.find((n) => n.serverId === notif.id));

      if (existing) {
        await existing.update((n) => {
          if (notif.isRead !== undefined) n.isRead = notif.isRead;
          n.updatedAtLocal = Date.now();
        });
      } else {
        await collections.notifications.create((n) => {
          n.serverId = notif.id!;
          n.type = notif.type ?? '';
          n.title = notif.title ?? '';
          n.body = notif.body ?? '';
          n.isRead = notif.isRead ?? false;
          n.dataJson = JSON.stringify(notif.data ?? {});
          n.createdAtServer = notif.createdAt ?? '';
          n.updatedAtLocal = Date.now();
        });
      }
    }
  });
}

// ─── Push: local queue → server ───────────────────────────────────────────────

async function flushSyncQueue(): Promise<void> {
  const pending = await collections.syncQueue.query().fetch();
  if (pending.length === 0) return;

  for (const item of pending) {
    try {
      const payload = item.payload;

      if (item.entityType === 'patient' && item.operation === 'create') {
        const response = await patientsApi.create(payload as CreatePatientRequest);
        const serverId = response.data.data.id;

        // Update local record with server ID
        const localRecord = await collections.patients.find(item.localRecordId);
        if (localRecord) {
          await database.write(async () => {
            await localRecord.update((p) => {
              p.serverId = serverId;
              p.syncStatus = 'synced';
            });
          });
        }
      } else if (item.entityType === 'referral' && item.operation === 'create') {
        const response = await referralsApi.create(payload as CreateReferralRequest);
        const serverReferral = response.data.data;

        const localRecord = await collections.referrals.find(item.localRecordId);
        if (localRecord) {
          await database.write(async () => {
            await localRecord.update((r) => {
              r.serverId = serverReferral.id;
              r.referralCode = serverReferral.referralCode;
              r.syncStatus = 'synced';
            });
          });
        }
      } else if (item.entityType === 'referral' && item.operation === 'update_status') {
        const { referralId, ...statusData } = payload as UpdateReferralStatusRequest & {
          referralId: number;
        };
        await referralsApi.updateStatus(referralId, statusData);
      }

      // Remove from queue on success
      await database.write(async () => {
        await item.destroyPermanently();
      });
    } catch (error) {
      // Increment retry count, max 5
      await database.write(async () => {
        await item.update((q) => {
          q.retryCount = (q.retryCount ?? 0) + 1;
          q.errorMessage = error instanceof Error ? error.message : 'Unknown error';
        });
      });
    }
  }
}

// ─── Main Sync Function ───────────────────────────────────────────────────────

export interface SyncResult {
  success: boolean;
  referralsUpdated: number;
  notificationsUpdated: number;
  pendingPushed: number;
  error?: string;
}

export async function performSync(): Promise<SyncResult> {
  try {
    const deviceId = deviceStorage.getDeviceId() ?? 'unknown-device';
    const lastSyncedAt = syncStorage.getLastSyncedAt() ?? new Date(0).toISOString();

    // Push pending local changes first
    await flushSyncQueue();

    // Pull server changes
    const response = await syncApi.sync({ lastSyncedAt, deviceId });
    const { referrals, notifications, serverTime } = response.data.data;

    await applyServerReferrals(referrals);
    await applyServerNotifications(notifications);

    // Save serverTime as new lastSyncedAt
    syncStorage.setLastSyncedAt(serverTime);

    return {
      success: true,
      referralsUpdated: referrals.length,
      notificationsUpdated: notifications.length,
      pendingPushed: 0,
    };
  } catch (error) {
    return {
      success: false,
      referralsUpdated: 0,
      notificationsUpdated: 0,
      pendingPushed: 0,
      error: error instanceof Error ? error.message : 'Sync failed',
    };
  }
}

// ─── Enqueue offline mutation ─────────────────────────────────────────────────

export async function enqueueOfflineMutation(
  entityType: 'patient' | 'referral',
  operation: 'create' | 'update_status',
  localRecordId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await database.write(async () => {
    await collections.syncQueue.create((q) => {
      q.entityType = entityType;
      q.operation = operation;
      q.localRecordId = localRecordId;
      q.payloadJson = JSON.stringify(payload);
      q.createdAtLocal = Date.now();
      q.retryCount = 0;
    });
  });
}
