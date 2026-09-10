import { Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';
import type * as Notifications from 'expo-notifications';

export const INCOMING_CALL_CATEGORY = 'incoming_call';
export const ACTION_ANSWER = 'ANSWER_ACTION';
export const ACTION_DECLINE = 'DECLINE_ACTION';
export const CALL_CHANNEL_ID = 'incoming_calls';
export const DEFAULT_ACTION_IDENTIFIER = 'expo.modules.notifications.actions.DEFAULT';

export interface IncomingCallPayload {
  type: 'incoming_call';
  callId: string;
  name: string;
  number: string;
  label?: string;
  avatarColor?: string;
}

/**
 * Returns whether native background / lockscreen notifications via expo-notifications
 * are supported in the current runtime environment.
 *
 * Notice: Expo Go on Android removed remote/push notifications in SDK 53+.
 * Standalone builds and Development Builds (npx expo run:android / eas build)
 * fully support native notifications.
 */
export function isNotificationsSupported(): boolean {
  if (Platform.OS === 'web') return false;
  if (isRunningInExpoGo() && Platform.OS === 'android') {
    return false;
  }
  return true;
}

let cachedNotifications: typeof Notifications | null = null;
let didAttemptLoad = false;

function getNotificationsModule(): typeof Notifications | null {
  if (!isNotificationsSupported()) {
    return null;
  }
  if (didAttemptLoad) {
    return cachedNotifications;
  }
  didAttemptLoad = true;
  try {
    // Dynamic require avoids loading sideEffects in Expo Go on Android
    cachedNotifications = require('expo-notifications');
    return cachedNotifications;
  } catch (err) {
    console.warn('[IncomingCallService] Could not load expo-notifications:', err);
    return null;
  }
}

let isInitialized = false;

/**
 * Initialize Android notification channels, notification categories (Answer/Decline actions),
 * and check/request necessary permissions.
 */
export async function setupIncomingCallNotifications(): Promise<boolean> {
  const NotificationsModule = getNotificationsModule();
  if (!NotificationsModule) {
    return false;
  }

  if (isInitialized) {
    return true;
  }

  try {
    // Configure foreground notification presentation behavior
    NotificationsModule.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        priority: NotificationsModule.AndroidNotificationPriority.MAX,
      }),
    });

    // 1. Request permissions
    const { status: existingStatus } = await NotificationsModule.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await NotificationsModule.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowCriticalAlerts: true,
        },
      });
      finalStatus = status;
    }

    // 2. Set up Android Notification Channel with maximum importance
    if (Platform.OS === 'android') {
      await NotificationsModule.setNotificationChannelAsync(CALL_CHANNEL_ID, {
        name: 'Incoming Phone Calls',
        importance: NotificationsModule.AndroidImportance.MAX,
        vibrationPattern: [0, 600, 400, 600, 400, 600],
        sound: 'default',
        enableVibrate: true,
        bypassDnd: true,
        lockscreenVisibility: NotificationsModule.AndroidNotificationVisibility.PUBLIC,
        audioAttributes: {
          usage: NotificationsModule.AndroidAudioUsage.NOTIFICATION_RINGTONE,
          contentType: NotificationsModule.AndroidAudioContentType.SONIFICATION,
          flags: {
            enforceAudibility: true,
            requestHardwareAudioVideoSynchronization: false,
          },
        },
      });
    }

    // 3. Register Notification Category with "Answer" & "Decline" interactive actions
    await NotificationsModule.setNotificationCategoryAsync(INCOMING_CALL_CATEGORY, [
      {
        identifier: ACTION_ANSWER,
        buttonTitle: 'Answer',
        options: {
          opensAppToForeground: true,
          isDestructive: false,
          isAuthenticationRequired: false,
        },
      },
      {
        identifier: ACTION_DECLINE,
        buttonTitle: 'Decline',
        options: {
          opensAppToForeground: false,
          isDestructive: true,
          isAuthenticationRequired: false,
        },
      },
    ]);

    isInitialized = true;
    return finalStatus === 'granted';
  } catch (error) {
    console.warn('[IncomingCallService] setup failed:', error);
    return false;
  }
}

/**
 * Schedules an incoming call notification after `delaySeconds`.
 * This allows testing the exact scenario where the user locks their screen or closes the app.
 */
export async function scheduleIncomingCallNotification(
  caller: {
    name: string;
    number: string;
    label?: string;
    avatarColor?: string;
  },
  delaySeconds: number = 5
): Promise<string> {
  const NotificationsModule = getNotificationsModule();
  if (!NotificationsModule) {
    return 'fallback_' + Date.now();
  }

  await setupIncomingCallNotifications();

  const callId = 'call_' + Date.now();
  const payload: IncomingCallPayload = {
    type: 'incoming_call',
    callId,
    name: caller.name,
    number: caller.number,
    label: caller.label || 'Mobile',
    avatarColor: caller.avatarColor || '#208AEF',
  };

  const notificationId = await NotificationsModule.scheduleNotificationAsync({
    content: {
      title: `Incoming Call`,
      subtitle: caller.name,
      body: `${caller.name} (${caller.number}) is calling...`,
      data: payload as unknown as Record<string, unknown>,
      categoryIdentifier: INCOMING_CALL_CATEGORY,
      sound: 'default',
      priority: NotificationsModule.AndroidNotificationPriority.MAX,
      vibrate: [0, 600, 400, 600],
      autoDismiss: false,
      sticky: true,
      ...(Platform.OS === 'android' ? { channelId: CALL_CHANNEL_ID } : {}),
    },
    trigger: {
      type: NotificationsModule.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: Math.max(1, delaySeconds),
      repeats: false,
    },
  });

  return notificationId;
}

/**
 * Dismiss a specific notification or all active call notifications.
 */
export async function dismissIncomingCallNotification(notificationId?: string): Promise<void> {
  const NotificationsModule = getNotificationsModule();
  if (!NotificationsModule) return;

  try {
    if (notificationId) {
      await NotificationsModule.dismissNotificationAsync(notificationId);
    } else {
      await NotificationsModule.dismissAllNotificationsAsync();
    }
  } catch (err) {
    console.warn('[IncomingCallService] dismiss failed:', err);
  }
}

/**
 * Retrieves the cold-start notification response if the app was launched by tapping a notification.
 */
export async function getLastNotificationResponse(): Promise<Notifications.NotificationResponse | null> {
  const NotificationsModule = getNotificationsModule();
  if (!NotificationsModule) return null;

  try {
    return await NotificationsModule.getLastNotificationResponseAsync();
  } catch (err) {
    console.warn('[IncomingCallService] getLastNotificationResponse error:', err);
    return null;
  }
}

/**
 * Subscribes to notification response interactions while the app is alive.
 * Returns an unsubscribe cleanup function.
 */
export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void
): () => void {
  const NotificationsModule = getNotificationsModule();
  if (!NotificationsModule) {
    return () => {};
  }

  try {
    const subscription = NotificationsModule.addNotificationResponseReceivedListener(callback);
    return () => subscription.remove();
  } catch (err) {
    console.warn('[IncomingCallService] addNotificationResponseListener error:', err);
    return () => {};
  }
}
