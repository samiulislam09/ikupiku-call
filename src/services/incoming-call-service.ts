import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

export const INCOMING_CALL_CATEGORY = 'incoming_call';
export const ACTION_ANSWER = 'ANSWER_ACTION';
export const ACTION_DECLINE = 'DECLINE_ACTION';
export const CALL_CHANNEL_ID = 'incoming_calls';

export interface IncomingCallPayload {
  type: 'incoming_call';
  callId: string;
  name: string;
  number: string;
  label?: string;
  avatarColor?: string;
}

// Configure how notifications appear when received in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    priority: Notifications.AndroidNotificationPriority.MAX,
  }),
});

let isInitialized = false;

/**
 * Initialize Android notification channels, notification categories (Answer/Decline actions),
 * and check/request necessary permissions.
 */
export async function setupIncomingCallNotifications(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return true;
  }

  if (isInitialized) {
    return true;
  }

  try {
    // 1. Request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync({
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
      await Notifications.setNotificationChannelAsync(CALL_CHANNEL_ID, {
        name: 'Incoming Phone Calls',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 600, 400, 600, 400, 600],
        sound: 'default',
        enableVibrate: true,
        bypassDnd: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        audioAttributes: {
          usage: Notifications.AndroidAudioUsage.NOTIFICATION_RINGTONE,
          contentType: Notifications.AndroidAudioContentType.SONIFICATION,
          flags: {
            enforceAudibility: true,
            requestHardwareAudioVideoSynchronization: false,
          },
        },
      });
    }

    // 3. Register Notification Category with "Answer" & "Decline" interactive actions
    await Notifications.setNotificationCategoryAsync(INCOMING_CALL_CATEGORY, [
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

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: `Incoming Call`,
      subtitle: caller.name,
      body: `${caller.name} (${caller.number}) is calling...`,
      data: payload as unknown as Record<string, unknown>,
      categoryIdentifier: INCOMING_CALL_CATEGORY,
      sound: 'default',
      priority: Notifications.AndroidNotificationPriority.MAX,
      vibrate: [0, 600, 400, 600],
      autoDismiss: false,
      sticky: true,
      ...(Platform.OS === 'android' ? { channelId: CALL_CHANNEL_ID } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
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
  try {
    if (notificationId) {
      await Notifications.dismissNotificationAsync(notificationId);
    } else {
      await Notifications.dismissAllNotificationsAsync();
    }
  } catch (err) {
    console.warn('[IncomingCallService] dismiss failed:', err);
  }
}
