/**
 * WatermelonDB Database Instance
 */
import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { schema } from './schema';
import { PatientModel, ReferralModel, NotificationModel, SyncQueueModel } from './models';

// BUG FIX: jsi: true was set but the JSI native module is NOT registered in
// MainApplication.kt (DatabaseBridge.install() call is missing) and the
// required C++ JSI library is not linked in the Gradle build.
// Setting jsi: false uses the standard async bridge which works out-of-the-box.
// To re-enable JSI for better performance, follow the WatermelonDB JSI guide:
// https://watermelondb.dev/docs/Installation#jsi-installation-android
const adapter = new SQLiteAdapter({
  schema,
  dbName: 'prms_offline',
  jsi: false,
  onSetUpError: (error) => {
    console.error('WatermelonDB setup error:', error);
  },
});

export const database = new Database({
  adapter,
  modelClasses: [PatientModel, ReferralModel, NotificationModel, SyncQueueModel],
});

export const collections = {
  patients: database.get<PatientModel>('patients'),
  referrals: database.get<ReferralModel>('referrals'),
  notifications: database.get<NotificationModel>('notifications'),
  syncQueue: database.get<SyncQueueModel>('sync_queue'),
};
