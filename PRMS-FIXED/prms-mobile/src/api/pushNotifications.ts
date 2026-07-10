/**
 * Push Notification Service — Firebase Cloud Messaging
 * Per PRMS_API_Reference §2.7 (device registration) and §7 (notification types).
 */
import messaging from '@react-native-firebase/messaging';
import PushNotification from 'react-native-push-notification';
import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { authApi } from '@api/services';
import { deviceStorage } from '@utils/tokenStorage';
import { queryClient, queryKeys } from '@api/queryClient';
import type { NotificationType } from '@types/index';

let isInitialized = false;

// ─── Setup local notification channel (Android) ──────────────────────────────

function configureLocalNotifications(): void {
  PushNotification.configure({
    onNotification: (notification) => {
      // Tapping a local/foreground notification — handled by deep link logic
      // in App.tsx via PushNotification.popInitialNotification or similar.
    },
    permissions: { alert: true, badge: true, sound: true },
    popInitialNotification: true,
    requestPermissions: Platform.OS === 'ios',
  });

  if (Platform.OS === 'android') {
    PushNotification.createChannel(
      {
        channelId: 'prms-default',
        channelName: 'PRMS Notifications',
        channelDescription: 'Referral updates, chat messages, and alerts',
        importance: 4, // IMPORTANCE_HIGH
        vibrate: true,
      },
      () => {},
    );
  }
}

// ─── Register device token with backend ──────────────────────────────────────

async function registerDeviceToken(): Promise<void> {
  try {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (!enabled) return;

    const fcmToken = await messaging().getToken();
    let deviceId = deviceStorage.getDeviceId();

    if (!deviceId) {
      deviceId = await DeviceInfo.getUniqueId();
      deviceStorage.setDeviceId(deviceId);
    }

    await authApi.registerDevice({
      fcmToken,
      deviceId,
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
    });
  } catch (error) {
    console.warn('[Push] Failed to register device token:', error);
  }
}

// ─── Foreground message handler ──────────────────────────────────────────────

function showLocalNotification(title: string, body: string, data: Record<string, unknown>): void {
  PushNotification.localNotification({
    channelId: 'prms-default',
    title,
    message: body,
    userInfo: data,
    playSound: true,
    soundName: 'default',
  });
}

function handleIncomingNotification(type: NotificationType): void {
  // Invalidate relevant queries so UI refreshes when the app is foregrounded
  queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unread() });
  queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() });

  if (type.startsWith('REFERRAL_')) {
    queryClient.invalidateQueries({ queryKey: ['referrals'] });
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function initializePushNotifications(): Promise<void> {
  if (isInitialized) return;
  isInitialized = true;

  configureLocalNotifications();
  await registerDeviceToken();

  // Re-register if FCM token rotates
  messaging().onTokenRefresh(() => {
    registerDeviceToken();
  });

  // App in foreground
  messaging().onMessage(async (remoteMessage) => {
    const { notification, data } = remoteMessage;
    const type = (data?.type as NotificationType) ?? 'REFERRAL_DISPATCHED';

    if (notification) {
      showLocalNotification(notification.title ?? 'PRMS', notification.body ?? '', data ?? {});
    }

    handleIncomingNotification(type);
  });

  // App opened from background via notification tap
  messaging().onNotificationOpenedApp((remoteMessage) => {
    const type = (remoteMessage.data?.type as NotificationType) ?? 'REFERRAL_DISPATCHED';
    handleIncomingNotification(type);
    // Deep-link navigation handled in App.tsx via a shared navigation ref
  });

  // App opened from quit state via notification tap
  const initialNotification = await messaging().getInitialNotification();
  if (initialNotification) {
    const type = (initialNotification.data?.type as NotificationType) ?? 'REFERRAL_DISPATCHED';
    handleIncomingNotification(type);
  }

  // Background handler must be set outside the component tree (index.js-level)
  // but we expose it here for App.tsx to register once at startup.
}

export function setBackgroundMessageHandler(): void {
  messaging().setBackgroundMessageHandler(async (remoteMessage) => {
    const { notification, data } = remoteMessage;
    if (notification) {
      showLocalNotification(notification.title ?? 'PRMS', notification.body ?? '', data ?? {});
    }
  });
}
