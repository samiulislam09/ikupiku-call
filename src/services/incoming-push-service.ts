/**
 * Killed-state incoming-call push handling: Firebase Cloud Messaging (data
 * payload `{type:"incoming_call", callId, caller, to}`) + notifee (the
 * full-screen/heads-up Android notification that actually rings the phone).
 *
 * Phase 3 is Android-only, and Expo Go ships no custom native modules, so
 * @react-native-firebase/{app,messaging} and @notifee/react-native (both
 * compiled native code) are unavailable there — only an ilubilu dev build
 * (expo-dev-client) or a production build has them compiled in. Every
 * `require()` below is therefore lazy and wrapped in try/catch — the same
 * durability pattern as sip-engine's `nativeModules` block — so importing
 * this module (and, critically, index.js calling registerKilledStateHandlers
 * before expo-router mounts) never crashes web or Expo Go.
 */
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { loadCachedCreds } from './creds-cache';

export type IncomingPushData = { callId: string; caller: string; to: string };
export type PushCallAction = { action: 'answer' | 'decline' | 'opened'; data: IncomingPushData };

// Fixed so repeated FCM pushes for the same/duplicate ring UPDATE the one
// notification instead of stacking a new one on top of it.
const NOTIFICATION_ID = 'incoming-call';
// Distinct from the demo harness's `incoming_calls` channel (expo-notifications,
// src/services/incoming-call-service.ts) — this one backs the real FCM path.
const CHANNEL_ID = 'incoming_calls_fcm';

type NotifeeModule = typeof import('@notifee/react-native');
type MessagingModule = typeof import('@react-native-firebase/messaging');

/**
 * `Platform.OS === 'android'`: Phase 3 only ships incoming-call push on
 * Android. `Constants.appOwnership === 'expo'` is true ONLY inside Expo Go
 * itself — dev-client and bare/standalone builds report `null` here (see
 * sip-engine's `isExpoGo` for the same check applied to its own natives).
 */
export function isPushSupported(): boolean {
  return Platform.OS === 'android' && Constants.appOwnership !== 'expo';
}

function loadNotifee(): NotifeeModule | null {
  if (!isPushSupported()) return null;
  try {
    return require('@notifee/react-native');
  } catch {
    return null;
  }
}

function loadMessaging(): MessagingModule | null {
  if (!isPushSupported()) return null;
  try {
    return require('@react-native-firebase/messaging');
  } catch {
    return null;
  }
}

/** Structural check — used both for notifee's own `data` (just these three
 * keys, no `type`) and for the raw FCM `data` payload (which also carries
 * `type`, checked separately by callers before this runs). */
function isIncomingPushData(value: Record<string, unknown> | undefined | null): value is IncomingPushData {
  return (
    !!value &&
    typeof value.callId === 'string' &&
    typeof value.caller === 'string' &&
    typeof value.to === 'string'
  );
}

function toIncomingPushData(value: Record<string, unknown> | undefined | null): IncomingPushData | null {
  return isIncomingPushData(value) ? { callId: value.callId, caller: value.caller, to: value.to } : null;
}

// Channels can only be created, never truly "re-created" — createChannel is
// safe to call repeatedly (it upserts), but there's no reason to hit the
// bridge on every single displayNotification call.
let channelEnsured = false;

async function ensureChannel(notifeeApi: NotifeeModule): Promise<void> {
  if (channelEnsured) return;
  await notifeeApi.default.createChannel({
    id: CHANNEL_ID,
    name: 'Incoming calls',
    importance: notifeeApi.AndroidImportance.HIGH,
    sound: 'default',
    vibration: true,
    vibrationPattern: [0, 1000, 500, 1000],
    visibility: notifeeApi.AndroidVisibility.PUBLIC,
  });
  channelEnsured = true;
}

/**
 * Displays (or, via the fixed `NOTIFICATION_ID`, updates) the full-screen
 * incoming-call notification. Called both from the killed-state background
 * handler (headless, no component tree) and, later, from the foreground UI
 * path — must never throw into either caller.
 */
export async function displayIncomingCallNotification(data: IncomingPushData): Promise<void> {
  const notifeeApi = loadNotifee();
  if (!notifeeApi) return;
  try {
    await ensureChannel(notifeeApi);
    await notifeeApi.default.displayNotification({
      id: NOTIFICATION_ID,
      title: 'Incoming call',
      body: data.caller,
      data: { callId: data.callId, caller: data.caller, to: data.to },
      android: {
        channelId: CHANNEL_ID,
        category: notifeeApi.AndroidCategory.CALL,
        importance: notifeeApi.AndroidImportance.HIGH,
        // Launches the app over the lockscreen even from a fully killed
        // state — the whole point of a call notification.
        fullScreenAction: { id: 'default' },
        // A plain body press behaves the same as full-screen: open the app
        // (mapped to 'opened' on the UI side via getInitialPushAction).
        pressAction: { id: 'default', launchActivity: 'default' },
        actions: [
          { title: 'Answer', pressAction: { id: 'answer', launchActivity: 'default' } },
          // No launchActivity: handled entirely in the background/foreground
          // event handlers below without ever bringing the app forward.
          { title: 'Decline', pressAction: { id: 'decline' } },
        ],
        ongoing: true,
        autoCancel: false,
        // Stop ringing after 35s even if nothing else clears it — matches a
        // caller-side ring timeout with headroom.
        timeoutAfter: 35000,
        // Without this the alert sound plays once and then the notification
        // sits silent for the rest of the 35s ring window (NotificationAndroid.d.ts:
        // "by default, the sound will only play once... useful if you have an
        // ongoing notification" — this is one). `sound: 'default'` is set here
        // too even though the .d.ts says the notification-level `sound` field
        // "has no behaviour on Android after API level version 26, instead you
        // can set the sound on the notification channels" (channel-level
        // `sound: 'default'` on CHANNEL_ID above already covers API 26+) —
        // belt-and-suspenders for any pre-API-26 device, since loopSound's doc
        // doesn't specify which of the two sounds it loops.
        sound: 'default',
        loopSound: true,
      },
    });
  } catch {
    /* best-effort — a failed display must not crash a background handler */
  }
}

export async function cancelIncomingCallNotification(): Promise<void> {
  const notifeeApi = loadNotifee();
  if (!notifeeApi) return;
  try {
    await notifeeApi.default.cancelNotification(NOTIFICATION_ID);
  } catch {
    /* best-effort */
  }
}

let killedStateHandlersRegistered = false;

/**
 * Registers the handlers that must exist before the killed-state FCM
 * background message handler can fire (Android invokes it headlessly, with
 * no component tree mounted). Must be safe to call synchronously from
 * index.js before expo-router mounts (no top-level await — internal async
 * work is fire-and-forget) and idempotent (index.js calls it unconditionally
 * on every cold start).
 */
export function registerKilledStateHandlers(): void {
  if (killedStateHandlersRegistered) return;
  killedStateHandlersRegistered = true;
  if (!isPushSupported()) return;

  const messagingApi = loadMessaging();
  if (messagingApi) {
    try {
      const messagingInstance = messagingApi.getMessaging();
      messagingApi.setBackgroundMessageHandler(messagingInstance, async (message) => {
        const data = message.data as Record<string, unknown> | undefined;
        if (data?.type !== 'incoming_call') return;
        const pushData = toIncomingPushData(data);
        if (!pushData) return;
        // Guard against ringing for an account no longer signed in on this
        // device: logout() clears the SecureStore creds cache (see
        // creds-cache.ts), so its presence is exactly "this device still
        // owns a live line" — an expired/rotated FCM token that never made
        // it back to a logout() call (killed process, uninstall, etc.)
        // otherwise leaves the server's DeviceToken row (and therefore this
        // background handler) alive forever for an account this phone left.
        // The `sipExtension !== data.to` check additionally covers a push
        // queued for a PREVIOUS account still arriving after a same-device
        // user switch (the cache now holds the NEW account's extension).
        const cached = await loadCachedCreds();
        if (!cached || cached.sipExtension !== pushData.to) return;
        await displayIncomingCallNotification(pushData);
      });
    } catch {
      /* best-effort */
    }
  }

  const notifeeApi = loadNotifee();
  if (notifeeApi) {
    try {
      // Only a single background event handler can be registered for the
      // whole application (notifee docs) — this call is it.
      notifeeApi.default.onBackgroundEvent(async (event) => {
        if (event.type !== notifeeApi.EventType.ACTION_PRESS) return;
        if (event.detail.pressAction?.id !== 'decline') return;
        // SIP-level rejection is out of scope this phase — the caller keeps
        // ringing (and the callee's other devices/lines keep ringing) until
        // the SIP-side timeout. This only clears the local notification so
        // the phone stops visually/audibly alerting.
        await cancelIncomingCallNotification();
      });
    } catch {
      /* best-effort */
    }
  }
}

/**
 * Cold-start check: was the app launched by the user interacting with the
 * incoming-call notification (as opposed to a plain app icon tap)? Answer
 * presses and plain body presses both carry `launchActivity: 'default'` and
 * so both can cold-start the app this way; decline never does (no
 * `launchActivity`), so it never reaches here.
 */
export async function getInitialPushAction(): Promise<PushCallAction | null> {
  const notifeeApi = loadNotifee();
  if (!notifeeApi) return null;
  try {
    const initial = await notifeeApi.default.getInitialNotification();
    if (!initial) return null;
    const data = toIncomingPushData(initial.notification.data as Record<string, unknown> | undefined);
    if (!data) return null;
    const pressActionId = initial.pressAction?.id;
    return { action: pressActionId === 'answer' ? 'answer' : 'opened', data };
  } catch {
    return null;
  }
}

export function addForegroundPushListeners(cb: {
  onIncomingPush: (data: IncomingPushData) => void;
  onNotificationAction: (a: PushCallAction) => void;
}): () => void {
  const unsubscribers: (() => void)[] = [];

  const messagingApi = loadMessaging();
  if (messagingApi) {
    try {
      const messagingInstance = messagingApi.getMessaging();
      const unsubscribe = messagingApi.onMessage(messagingInstance, (message) => {
        const data = message.data as Record<string, unknown> | undefined;
        if (data?.type !== 'incoming_call') return;
        const pushData = toIncomingPushData(data);
        if (pushData) cb.onIncomingPush(pushData);
      });
      unsubscribers.push(unsubscribe);
    } catch {
      /* best-effort */
    }
  }

  const notifeeApi = loadNotifee();
  if (notifeeApi) {
    try {
      const unsubscribe = notifeeApi.default.onForegroundEvent(({ type, detail }) => {
        if (type !== notifeeApi.EventType.PRESS && type !== notifeeApi.EventType.ACTION_PRESS) return;
        const data = toIncomingPushData(detail.notification?.data as Record<string, unknown> | undefined);
        if (!data) return;
        const pressActionId = detail.pressAction?.id;
        const action = pressActionId === 'answer' ? 'answer' : pressActionId === 'decline' ? 'decline' : 'opened';
        cb.onNotificationAction({ action, data });
      });
      unsubscribers.push(unsubscribe);
    } catch {
      /* best-effort */
    }
  }

  return () => {
    for (const unsubscribe of unsubscribers) {
      try {
        unsubscribe();
      } catch {
        /* already unsubscribed */
      }
    }
  };
}

/** Covers Android 13+'s runtime POST_NOTIFICATIONS permission (a no-op grant
 * on older Android, which never required it). */
export async function requestPushPermissions(): Promise<boolean> {
  const notifeeApi = loadNotifee();
  if (!notifeeApi) return false;
  try {
    const settings = await notifeeApi.default.requestPermission();
    return settings.authorizationStatus >= notifeeApi.AuthorizationStatus.AUTHORIZED;
  } catch {
    return false;
  }
}

export async function getFcmToken(): Promise<string | null> {
  const messagingApi = loadMessaging();
  if (!messagingApi) return null;
  try {
    return await messagingApi.getToken(messagingApi.getMessaging());
  } catch {
    return null;
  }
}

export function onFcmTokenRefresh(cb: (token: string) => void): () => void {
  const messagingApi = loadMessaging();
  if (!messagingApi) return () => {};
  try {
    return messagingApi.onTokenRefresh(messagingApi.getMessaging(), cb);
  } catch {
    return () => {};
  }
}
