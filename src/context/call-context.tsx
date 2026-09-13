import * as Linking from 'expo-linking';
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react';
import { AppState } from 'react-native';

import type { Contact } from '@/components/contacts/contact-details-modal';
import { useAuth } from '@/context/auth-context';
import {
    ApiError,
    getDeviceId,
    getSoftphone,
    placeCall,
    reportCall,
    type PlaceCallResult,
} from '@/services/api';
import { loadCachedCreds, saveCachedCreds } from '@/services/creds-cache';
import {
    ACTION_ANSWER,
    ACTION_DECLINE,
    addNotificationResponseListener,
    DEFAULT_ACTION_IDENTIFIER,
    dismissIncomingCallNotification,
    getLastNotificationResponse,
    IncomingCallPayload,
    isNotificationsSupported,
    scheduleIncomingCallNotification,
    setupIncomingCallNotifications,
} from '@/services/incoming-call-service';
import {
    addForegroundPushListeners,
    cancelIncomingCallNotification,
    getFcmToken,
    getInitialPushAction,
    isPushSupported,
    onFcmTokenRefresh,
    requestPushPermissions,
    type IncomingPushData,
    type PushCallAction,
} from '@/services/incoming-push-service';
import { registerToken } from '@/services/push-registration';
import { useSipEngine, type SipEngineConfig } from '@/services/sip-engine';
import { appStorage } from '@/utils/storage';

// While the credential loop's softphone-ready poll keeps returning
// {ready:false}, give up and surface a hint after this long.
const CREDENTIAL_POLL_TIMEOUT_MS = 2 * 60 * 1000;
const CREDENTIAL_POLL_INTERVAL_MS = 10 * 1000;
// How long to wait, after a {type:"pstn"} placeCall response, for the
// agent-leg INVITE to actually arrive before giving up and cancelling the
// call locally (there's no SIP session yet for engine.hangup() to act on).
const PSTN_PLACEMENT_WATCHDOG_MS = 25 * 1000;
// How long after arming a PSTN agent-leg to keep trusting a subsequent
// engine "incoming" transition as our own late agent leg rather than a
// genuine third-party inbound call — mirrors sip-engine's internal
// AGENT_LEG_WINDOW_MS.
const AGENT_LEG_AUTO_ANSWER_WINDOW_MS = 8000;
// How long a push-woken "push-wait" (see startPushWait below) keeps ringing
// before giving up on the real SIP INVITE ever arriving and logging a missed
// call — the socket lost the race against the push, or the mid-ring
// re-registration risk materialized and the INVITE was never delivered.
const PUSH_WAIT_TIMEOUT_MS = 30 * 1000;
// After a real PSTN call ends, auth.refreshMe() is fired immediately AND
// once more after this delay — the call-ended webhook's own deduction can
// land slightly after our local "call ended" transition, so the immediate
// refresh can race a not-yet-applied balance update. This second refresh
// catches that.
const PSTN_BALANCE_REFRESH_DELAY_MS = 15 * 1000;

export type CallStatus = 'idle' | 'incoming' | 'outgoing' | 'connected' | 'ended';

export interface CallerInfo {
  name: string;
  number: string;
  label?: string;
  avatarColor?: string;
}

export interface CallRecord {
  id: string;
  name: string;
  number: string;
  type: 'incoming' | 'outgoing' | 'missed';
  time: string;
  section: 'Today' | 'Yesterday' | 'Older';
  label: string;
  duration?: string;
  avatarColor: string;
  timestamp?: number;
  // Additive — existing persisted rows predate this field and simply lack
  // it. Populated only for a real (non-simulated) call: a PSTN placement's
  // placeCall result.call.call_id, or a push-woken incoming call's
  // pushWaitCallIdRef value. A plain internal SIP dial or a genuine
  // (non-pushed) inbound call has no known call id and leaves this unset.
  selxCallId?: string;
}

export const INITIAL_CALL_LOGS: CallRecord[] = [
  {
    id: '1',
    name: 'Sarah Jenkins',
    number: '+1 (555) 342-9812',
    type: 'missed',
    time: '11:45 AM',
    section: 'Today',
    label: 'Mobile',
    avatarColor: '#F43F5E',
    timestamp: Date.now() - 3600000 * 3,
  },
  {
    id: '2',
    name: 'David Miller',
    number: '+1 (555) 762-1104',
    type: 'incoming',
    time: '10:15 AM',
    section: 'Today',
    label: 'Work',
    duration: '4m 32s',
    avatarColor: '#3B82F6',
    timestamp: Date.now() - 3600000 * 5,
  },
  {
    id: '3',
    name: '+1 (555) 902-8341',
    number: '+1 (555) 902-8341',
    type: 'outgoing',
    time: '8:20 AM',
    section: 'Today',
    label: 'Unknown',
    duration: '1m 15s',
    avatarColor: '#8B5CF6',
    timestamp: Date.now() - 3600000 * 7,
  },
  {
    id: '4',
    name: 'Emily Watson',
    number: '+1 (555) 619-2044',
    type: 'incoming',
    time: 'Yesterday',
    section: 'Yesterday',
    label: 'Home',
    duration: '12m 04s',
    avatarColor: '#10B981',
    timestamp: Date.now() - 86400000,
  },
  {
    id: '5',
    name: 'Marcus Vance',
    number: '+1 (555) 441-9032',
    type: 'missed',
    time: 'Yesterday',
    section: 'Yesterday',
    label: 'Mobile',
    avatarColor: '#F43F5E',
    timestamp: Date.now() - 86400000 * 1.2,
  },
  {
    id: '6',
    name: 'Elena Rostova',
    number: '+1 (555) 883-7120',
    type: 'outgoing',
    time: 'Yesterday',
    section: 'Yesterday',
    label: 'Mobile',
    duration: '2m 45s',
    avatarColor: '#F59E0B',
    timestamp: Date.now() - 86400000 * 1.5,
  },
  {
    id: '7',
    name: 'Dr. Robert Chen',
    number: '+1 (555) 234-9081',
    type: 'incoming',
    time: 'Oct 12',
    section: 'Older',
    label: 'Clinic',
    duration: '6m 18s',
    avatarColor: '#06B6D4',
    timestamp: Date.now() - 86400000 * 3,
  },
  {
    id: '8',
    name: 'Olivia Martinez',
    number: '+1 (555) 489-0199',
    type: 'outgoing',
    time: 'Oct 10',
    section: 'Older',
    label: 'Mobile',
    duration: '35s',
    avatarColor: '#EC4899',
    timestamp: Date.now() - 86400000 * 5,
  },
];

const DEFAULT_CALLER: CallerInfo = {
  name: 'Sarah Jenkins',
  number: '+1 (555) 342-9812',
  label: 'Mobile',
  avatarColor: '#F43F5E',
};

interface CallContextType {
  callStatus: CallStatus;
  caller: CallerInfo;
  duration: number;
  formattedDuration: string;
  isMuted: boolean;
  isSpeakerOn: boolean;
  isOnHold: boolean;
  isVideoOn: boolean;
  isInCallKeypadOpen: boolean;
  isMinimized: boolean;
  callLogs: CallRecord[];
  startCall: (caller?: Partial<CallerInfo>) => void;
  receiveIncomingCall: (caller?: Partial<CallerInfo>) => void;
  acceptCall: () => void;
  declineCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleSpeaker: () => void;
  toggleHold: () => void;
  toggleVideo: () => void;
  toggleKeypad: () => void;
  setIsMinimized: (minimized: boolean) => void;
  deleteCallRecord: (id: string) => void;
  clearCallLogs: () => void;
  addCustomCallRecord: (record: Omit<CallRecord, 'id'>) => void;
  scheduleTestIncomingCall: (delaySeconds?: number, caller?: Partial<CallerInfo>) => Promise<string>;
  // Real SIP engine additions (additive; every field above is unchanged).
  lineReady: boolean;
  lineError: string | null;
  /** Explicit user-driven retry: clears lineError, reopens the credential
   * loop's polling window, and refreshes `me` (whose extensionReady flip
   * also restarts the loop). Wired to the line-status banner's Retry. */
  retryLine: () => void;
  remainingSeconds: number | null;
  sendDtmf: (tone: string) => void;
}

const CallContext = createContext<CallContextType | null>(null);

function formatCurrentTime(): string {
  const d = new Date();
  let hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const minsStr = minutes < 10 ? '0' + minutes : minutes;
  return `${hours}:${minsStr} ${ampm}`;
}

function formatDurationShort(seconds: number): string {
  if (seconds <= 0) return '1s';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
}

/** Structural equality for SipEngineConfig — used to avoid handing
 * useSipEngine a fresh-identity-but-same-value config, which would tear
 * down and rebuild the whole UA/WebSocket (dropping any live call).
 *
 * Deliberately ignores `iceServers` once the four identity fields
 * (extension/password/host/wsUrl) match: short-lived TURN relay credentials
 * legitimately differ on every single credential-poll fetch even when
 * nothing meaningful changed, and comparing them would force a pointless
 * (and call-dropping) UA rebuild on every poll tick. This is safe because
 * useSipEngine only ever reads `config.iceServers` once, at UA-construction
 * time inside its main effect — a live registration never "picks up" a
 * fresher iceServers value without a rebuild anyway, so treating the config
 * as unchanged here doesn't lose anything a running UA could have used. */
function sipConfigsEqual(a: SipEngineConfig | null, b: SipEngineConfig | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.sipExtension === b.sipExtension &&
    a.sipPassword === b.sipPassword &&
    a.host === b.host &&
    a.wsUrl === b.wsUrl
  );
}

/** Strips display-only formatting (spaces, dashes, parentheses, dots)
 * before handing a number to placeCall — keeps a leading "+", digits, and
 * "*"/"#" for shortcodes intact. Deliberately NOT a general E.164
 * normalizer: the trunk wants the number exactly as dialed, just without UI
 * punctuation — with one narrow exception: a contact stored in full E.164
 * (`+880...`, Bangladesh's country code) fails to place on the PSTN trunk,
 * which expects the local `0`-prefixed form, so that one prefix is
 * denormalized back to local dialing. No other `+`-prefixed number is
 * touched. */
function toDialableNumber(raw: string): string {
  const stripped = raw.replace(/[\s().-]/g, '');
  if (stripped.startsWith('+880')) {
    return '0' + stripped.slice(4);
  }
  return stripped;
}

/** Contact-matches a raw SIP identity/number (an engine `remoteIdentity`, or
 * a push payload's `caller`) the same way for every genuine-inbound-shaped
 * path — the engine-state-mapping effect's own genuine-inbound branch AND
 * the push-woken push-wait (startPushWait) both need this: the push-wait in
 * particular has to show a caller name BEFORE any SIP session (and
 * therefore `engine.remoteIdentity`) exists. Suffix matching only kicks in
 * once both sides are long enough that a false positive is unlikely. */
function matchCallerFromIdentity(identity: string): CallerInfo {
  const idDigits = identity.replace(/\D/g, '');
  const contacts = appStorage.getJSON<Contact[]>('ilubilu_contacts', []);
  const matched = idDigits
    ? contacts.find((c) => {
        const phoneDigits = c.phone.replace(/\D/g, '');
        if (phoneDigits.length === 0) return false;
        if (phoneDigits === idDigits) return true;
        if (phoneDigits.length >= 7 && idDigits.length >= 7) {
          return phoneDigits.endsWith(idDigits) || idDigits.endsWith(phoneDigits);
        }
        return false;
      })
    : undefined;
  return {
    name: matched?.name || identity,
    number: identity,
    label: matched?.label || 'Mobile',
    avatarColor: matched?.avatarColor || DEFAULT_CALLER.avatarColor,
  };
}

export function CallProvider({ children }: { children: React.ReactNode }) {
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [caller, setCaller] = useState<CallerInfo>(DEFAULT_CALLER);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [isOnHold, setIsOnHold] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isInCallKeypadOpen, setIsInCallKeypadOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Call Logs state with localStorage persistence
  const [callLogs, setCallLogs] = useState<CallRecord[]>(() =>
    appStorage.getJSON('ilubilu_call_logs', INITIAL_CALL_LOGS)
  );

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoConnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remainingSecondsTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Tracks the "Call Ended" badge → idle tail timeout (600/700ms) shared by
  // every hang-up/decline/cancel path. Must be cancellable: a genuine
  // inbound call preempting mid-tail (see the mapping effect) needs to wipe
  // a still-pending tail before it fires and stomps the new incoming state.
  const endedTailTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const durationRef = useRef(0);
  const initialDirectionRef = useRef<'incoming' | 'outgoing'>('outgoing');

  // --- Real SIP engine wiring -------------------------------------------
  const auth = useAuth();
  const [engineConfig, setEngineConfig] = useState<SipEngineConfig | null>(null);
  const [lineReady, setLineReady] = useState(false);
  const [lineError, setLineError] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const engine = useSipEngine(engineConfig);

  // True only while the CURRENT call is being driven by the real engine
  // (either we placed/answered it ourselves, or a genuine inbound SIP call
  // arrived). Gates the engine-state-mapping effect below so the Test Call
  // harness / notification / deep-link simulated flows keep driving
  // `callStatus` untouched whenever no real call is in progress.
  const realCallActiveRef = useRef(false);
  // Armed in startCall's PSTN branch to `Date.now() + 8000` (mirroring
  // sip-engine's own AGENT_LEG_WINDOW_MS) — the mapping effect's auto-answer
  // branch below only trusts a "genuine inbound while realCallActiveRef is
  // true" transition as our own late agent leg while still inside this
  // window. Outside it, the same transition is let through to the normal
  // genuine-inbound handling and rings normally: sip-engine's own busy-486
  // reject (see useSipEngine) already guarantees this is only reachable
  // when there's no actually-live session left to orphan.
  const agentLegWindowUntilRef = useRef(0);
  const prevEngineCallStateRef = useRef(engine.callState);
  // Always mirrors the CURRENT (live) engine.callState, unlike reading
  // `engine.callState` from inside a closure captured earlier (e.g. a
  // setTimeout scheduled 25s ago) — that closure's `engine` object is a
  // frozen snapshot from whenever it was created, not reactive.
  const engineCallStateRef = useRef(engine.callState);
  useEffect(() => {
    engineCallStateRef.current = engine.callState;
  }, [engine.callState]);
  // Always mirrors the CURRENT callStatus, for the same closure-staleness
  // reason as engineCallStateRef above — read by the push-wait timeout's
  // closure (captured whenever startPushWait scheduled it) below.
  const callStatusRef = useRef(callStatus);
  useEffect(() => {
    callStatusRef.current = callStatus;
  }, [callStatus]);
  // Always points at the latest `endCall` closure; populated by an effect
  // right after `endCall` is defined below. Lets the PSTN countdown and the
  // engine-state-mapping effect (both declared earlier in the file) invoke
  // the current `endCall` without being re-created whenever it changes.
  const endCallRef = useRef<() => void>(() => {});
  // Monotonically-increasing id bumped every time startCall places a real
  // call. Lets the delayed PSTN placement watchdog (below) tell "the call
  // it was watching" apart from "some other, newer call that also happens
  // to be idle right now" instead of blindly trusting realCallActiveRef.
  const callAttemptIdRef = useRef(0);
  // Tracks whether the CURRENTLY active/just-ended real call is an internal
  // SIP call (an outgoing internal dial, or a genuine/push-woken inbound
  // call) or a PSTN call placed via placeCall's REST endpoint. Read once the
  // call ends to decide whether to self-report it via reportCall() (INTERNAL
  // only — the server already owns PSTN accounting from the trunk/webhook
  // side) or to just fire auth.refreshMe() to pick up a PSTN deduction.
  // Explicitly (re)assigned by every real-call-STARTING path below
  // (startCall's placeCall.then(), startPushWait, and the mapping effect's
  // fresh-genuine-inbound branch) before any teardown path can read it —
  // deliberately never cleared independently of that, since every new real
  // call always overwrites it before it matters again (mirrors how `caller`
  // state itself is never explicitly nulled between calls either).
  const activeCallKindRef = useRef<'internal' | 'pstn' | null>(null);
  // The selxCallId to attach to the CURRENT call's eventual CallRecord —
  // either a PSTN placement's placeCall result.call.call_id, or a
  // push-woken incoming call's pushWaitCallIdRef value, captured into THIS
  // ref at push-wait start because pushWaitCallIdRef itself gets wiped by
  // clearPushWait() long before the call the wait resolved into actually
  // ends. Stays null for a plain internal dial or a genuine (non-pushed)
  // inbound call — neither has a known call id to report.
  const activeSelxCallIdRef = useRef<string | null>(null);

  // --- Push-woken "push-wait" bookkeeping ---------------------------------
  // A push-wait is the genuine-inbound-shaped window between "we were woken
  // by an incoming-call push" and "the real SIP INVITE actually landed and
  // gave the engine a session." It sets realCallActiveRef = true and
  // callStatus = 'incoming' BEFORE any SIP session exists — the one state
  // this file's guards were never previously written to expect (every other
  // realCallActiveRef=true-with-engine-idle case is startCall's OWN outgoing
  // placement, not an inbound one). See startPushWait/clearPushWait below.
  //
  // True only while genuinely waiting on the INVITE for a push-announced
  // call; cleared (via clearPushWait) the instant the engine reaches
  // "incoming" for real, the 30s timeout gives up, or the user
  // declines/ends before either happens.
  const pushWaitActiveRef = useRef(false);
  // True iff the user already chose "Answer" (lockscreen action, or a
  // same-call notification-action press upgrading a prior "opened") before
  // the SIP session existed — consumed by the mapping effect the moment the
  // engine reaches "incoming" to auto-answer immediately instead of just
  // putting up the ring UI.
  const pushAnswerPendingRef = useRef(false);
  // The push's callId this push-wait is for — lets a duplicate/second push
  // event for the SAME call (e.g. the raw FCM data message AND a
  // notification-action press both arriving) be recognized as a dedup
  // rather than restarting the wait, while a push for a genuinely different
  // call still starts its own fresh wait.
  const pushWaitCallIdRef = useRef<string | null>(null);
  // Caller info resolved (via matchCallerFromIdentity) at push-wait start —
  // used only by the 30s timeout's missed-call log, since by the time it
  // fires the `caller` state may already have been overwritten by whatever
  // superseded this wait.
  const pushWaitCallerRef = useRef<CallerInfo | null>(null);
  const pushWaitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Bumped by both startPushWait (arming a NEW wait) and clearPushWait
  // (tearing one down). The 30s timeout closure below captures the gen it
  // was scheduled under and bails if the current gen has moved on by the
  // time it fires — belt-and-suspenders on top of the clearTimeout() calls
  // (mirrors callAttemptIdRef's role for the outgoing-placement watchdog):
  // even if some future code path fails to clear the timer itself, a
  // gen mismatch still stops the stale callback from acting.
  const pushWaitGenRef = useRef(0);
  // Guards the cold-start getInitialPushAction() check (below) to run at
  // most once per app session — the underlying native call is idempotent,
  // but nothing should replay a stale cold-start action after e.g. a
  // sign-out/sign-in cycle re-runs the effect it lives in.
  const initialPushCheckedRef = useRef(false);

  // Always mirrors the CURRENT engineConfig — read (not depended on) by the
  // credential loop below so it can skip handing useSipEngine a
  // fresh-identity-but-same-value config without needing `engineConfig`
  // itself in the effect's dependency array. Also used by the foreground
  // retry listener below to tell "we never got working creds" apart from
  // "we have creds and are just re-checking them."
  const engineConfigRef = useRef<SipEngineConfig | null>(engineConfig);
  useEffect(() => {
    engineConfigRef.current = engineConfig;
  }, [engineConfig]);

  // Retried after the 2-minute credential poll gives up: bumped by the
  // AppState foreground listener below (only while lineError is set AND we
  // still have no working engine config at all — this retry exists purely
  // for the "never got creds" case, not as a general recheck; a general
  // foreground recheck would otherwise refetch mid-call and risk handing
  // useSipEngine a config the real-call guard below has to reject anyway).
  const [credentialRetryTick, setCredentialRetryTick] = useState(0);
  const lineErrorRef = useRef<string | null>(null);
  useEffect(() => {
    lineErrorRef.current = lineError;
  }, [lineError]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && lineErrorRef.current && engineConfigRef.current === null) {
        setCredentialRetryTick((t) => t + 1);
      }
    });
    return () => sub.remove();
  }, []);

  // Credential loop: while signed in, fetch the softphone credentials and
  // poll every 10s until ready, giving up (with a lineError hint) after 2
  // minutes. Restarts whenever the signed-in user's id or extensionReady
  // flag changes, or the app returns to the foreground after giving up.
  // Tearing down (logout) sets engineConfig back to null; useSipEngine's
  // own effect cleanup handles unregistering/closing the socket.
  //
  // Deliberately depends on PRIMITIVES only (not the whole `auth.user`
  // object, which gets a fresh identity on every refreshMe()/getMe() call)
  // so a routine profile refresh mid-call doesn't restart this loop and
  // hand useSipEngine a new config object — see setEngineConfig below,
  // which additionally no-ops when the fetched creds are unchanged.
  useEffect(() => {
    if (auth.status !== 'signedIn') {
      setEngineConfig(null);
      setLineReady(false);
      setLineError(null);
      return;
    }

    // A restart of this loop (extensionReady flip, retryLine, foreground
    // retry) opens a fresh polling window — visibly return the banner to
    // "connecting" instead of leaving a stale "still being set up" error
    // while a live poll runs.
    setLineError(null);

    let cancelled = false;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let fetchInFlight = false;
    const startedAt = Date.now();
    // Captured once per effect run (this effect already restarts whenever
    // auth.user?.id changes — see the dependency array below), used both to
    // validate the cache seed's identity and to tag what this loop's own
    // fetches save back to the cache.
    const signedInUserId = auth.user?.id;

    const stopPolling = () => {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    };

    // Fast path: seed engineConfig from the SecureStore cache immediately so
    // a push-woken app can start SIP registration (STUN-only, no iceServers
    // in the cache) without waiting on the getSoftphone() round trip below.
    // Gated on engineConfigRef.current === null so this can never fight the
    // normal fetch: it only fires on the very first run for this signed-in
    // user (a config already existing means either the fetch already won an
    // earlier race, or this effect restarted for a reason — e.g.
    // extensionReady flipping — while already registered, in which case
    // reseeding from a possibly-stale cache would be pointless at best).
    // The userId match guards a stale cache from a previously signed-in user
    // on a shared device from ever seeding a different account's line.
    if (engineConfigRef.current === null && signedInUserId) {
      loadCachedCreds().then((cached) => {
        if (cancelled) return;
        // Mirrors the same guard on the fetch path below: if logout() ran
        // synchronously while this SecureStore read was in flight, don't
        // resurrect a config for a user we just signed out.
        if (auth.isSigningOut.current) return;
        // The network fetch (or a prior seed) may have already landed while
        // this SecureStore read was in flight — never clobber it.
        if (engineConfigRef.current !== null) return;
        if (!cached || cached.userId !== signedInUserId) return;
        setEngineConfig({
          sipExtension: cached.sipExtension,
          sipPassword: cached.sipPassword,
          host: cached.host,
          wsUrl: cached.wsUrl,
          // Deliberately no iceServers — see creds-cache.ts's module doc.
        });
      });
    }

    const attempt = async () => {
      // Non-overlapping: a slow getSoftphone() response must not let a
      // second poll tick stack another request on top of it.
      if (fetchInFlight) return;
      fetchInFlight = true;
      try {
        const creds = await getSoftphone(getDeviceId());
        if (cancelled) return;
        if (creds.ready && creds.sipExtension && creds.sipPassword && creds.host && creds.wsUrl) {
          setLineReady(true);
          setLineError(null);
          // Fire-and-forget on every successful ready fetch, independent of
          // whether sipConfigsEqual below decides anything actually changed
          // or whether the realCallActiveRef guard defers applying it — the
          // cache exists purely to seed a FUTURE cold start, so a fresh set
          // of valid creds is always worth persisting even when this run
          // doesn't touch the live engine config. Skipped mid-logout (see
          // auth.isSigningOut below) so an in-flight fetch that resolves
          // just after logout() has already cleared this device's cache
          // can't immediately re-write the password it just cleared.
          if (signedInUserId && !auth.isSigningOut.current) {
            saveCachedCreds({
              sipExtension: creds.sipExtension,
              sipPassword: creds.sipPassword,
              host: creds.host,
              wsUrl: creds.wsUrl,
              userId: signedInUserId,
            });
          }
          const nextConfig: SipEngineConfig = {
            sipExtension: creds.sipExtension,
            sipPassword: creds.sipPassword,
            host: creds.host,
            wsUrl: creds.wsUrl,
            iceServers: creds.iceServers,
          };
          // Force a replacement even when sipConfigsEqual says the identity
          // fields are unchanged, if the CURRENT config has no/empty
          // iceServers but this fresh result finally carries some. Needed
          // because the cache-seed fast path above deliberately omits
          // iceServers (see creds-cache.ts) — without this, a seeded config
          // whose identity fields happen to match the fresh fetch (the
          // common case: nothing rotated since last save) would make
          // sipConfigsEqual report "unchanged" forever, and useSipEngine
          // (which only reads config.iceServers once, at UA-construction
          // time) would never rebuild to pick up TURN relay support — the
          // engine would run STUN-only for the rest of the session. This
          // only fires once per cold start: once applied, engineConfigRef
          // has a non-empty iceServers and needsIceUpgrade goes false again.
          const needsIceUpgrade =
            !engineConfigRef.current?.iceServers?.length && (nextConfig.iceServers?.length ?? 0) > 0;
          if (!auth.isSigningOut.current && (!sipConfigsEqual(engineConfigRef.current, nextConfig) || needsIceUpgrade)) {
            if (
              engineConfigRef.current !== null &&
              realCallActiveRef.current &&
              !(pushWaitActiveRef.current && engineCallStateRef.current === 'idle')
            ) {
              // Never swap the engine's SIP identity out from under a live
              // call — useSipEngine tears down and rebuilds the whole
              // UA/WebSocket whenever `config`'s identity changes, which
              // would drop the call. Leave the poll running (skip
              // stopPolling()) so this is retried once the call ends; by
              // then sipConfigsEqual will very likely agree the config
              // hasn't meaningfully changed anyway (this branch is only
              // reached when extension/password/host/wsUrl actually
              // rotated, not just the TURN iceServers — see
              // sipConfigsEqual above — or when needsIceUpgrade forces a
              // one-time rebuild to pick up iceServers after a cache seed;
              // either way, deferring here just means the retry happens
              // once the live call ends, exactly like the identity-change
              // case).
              //
              // The `engineConfigRef.current !== null` guard matters for a
              // push-wait: startPushWait sets realCallActiveRef=true before
              // any engineConfig has EVER been applied (a push can cold-start
              // the app faster than this very fetch resolves). There is no
              // UA/WebSocket to "swap out from under" in that case — there's
              // nothing running yet — so this must NOT defer; deferring here
              // would mean the engine never registers at all, and the
              // push-wait's 30s timeout always expires. Once a config has
              // been applied at least once, the original "never swap a live
              // call's identity" protection reapplies exactly as before.
              //
              // The `!(pushWaitActiveRef.current && engineCallStateRef.current
              // === 'idle')` exemption covers the OTHER push-wait case: a
              // config WAS already applied once (e.g. the credential loop's
              // own cache-seed fast path registered a STUN-only config before
              // this fresh, TURN-bearing fetch landed), and a push-wait then
              // started on top of that already-registered engine. There is
              // still no live SIP session in this state (push-wait only ever
              // arms while engineCallStateRef is 'idle' — see startPushWait's
              // own gate), so a UA rebuild here costs nothing worse than a
              // re-REGISTER; it's worth paying that cost to swap in TURN
              // before the real INVITE arrives instead of leaving this
              // push-woken call running STUN-only for its whole duration.
              return;
            }
            setEngineConfig(nextConfig);
          }
          stopPolling();
          return;
        }
        setLineReady(false);
        if (Date.now() - startedAt >= CREDENTIAL_POLL_TIMEOUT_MS) {
          setLineError('Your line is still being set up.');
          stopPolling();
        }
      } catch {
        if (cancelled) return;
        setLineReady(false);
        if (Date.now() - startedAt >= CREDENTIAL_POLL_TIMEOUT_MS) {
          setLineError('Your line is still being set up.');
          stopPolling();
        }
      } finally {
        fetchInFlight = false;
      }
    };

    attempt();
    pollTimer = setInterval(attempt, CREDENTIAL_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      stopPolling();
    };
  }, [auth.status, auth.user?.id, auth.user?.extensionReady, credentialRetryTick]);

  // See CallContextType.retryLine — the banner's explicit retry button.
  const retryLine = useCallback(() => {
    setLineError(null);
    setCredentialRetryTick((t) => t + 1);
    void auth.refreshMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.refreshMe]);

  // Push-token registration: while signed in, the account's calling line is
  // provisioned (`extensionReady` — registering earlier would 409, since the
  // backend upserts the token against `appUser.ext`), and this platform
  // supports FCM push (Android dev-client/production build only — see
  // isPushSupported), request notification permission, fetch the device's
  // FCM token, and register it with the backend. Deliberately depends on
  // the same primitives as the credential loop above (not the whole
  // `auth.user` object) so a routine refreshMe() doesn't needlessly re-run
  // this — but a refreshMe() that flips extensionReady false→true DOES
  // re-run it, which is exactly the retry path for a registration that
  // earlier hit the backend's 409 (registerToken/registerPushToken already
  // swallow that status; see services/push-registration.ts). The
  // onFcmTokenRefresh subscription re-registers whenever the OS rotates the
  // token, independent of this effect re-running.
  useEffect(() => {
    if (auth.status !== 'signedIn' || !auth.user?.extensionReady || !isPushSupported()) {
      return;
    }

    let cancelled = false;

    (async () => {
      const granted = await requestPushPermissions();
      if (cancelled || !granted) return;
      const token = await getFcmToken();
      if (cancelled || !token) return;
      // Mirrors the credential loop's auth.isSigningOut guard above: a
      // logout() that started while this permission/token round trip was in
      // flight already fired its own unregisterLastToken() DELETE (see
      // auth-context.tsx) — registering now would re-add this device's
      // token to the backend AFTER that DELETE, right as the token/creds it
      // needs to keep working are being cleared, leaving a signed-out
      // device still ringing for the account it just left.
      if (auth.isSigningOut.current) return;
      await registerToken(token);
    })();

    const unsubscribe = onFcmTokenRefresh((token) => {
      // Same race as above, via a different trigger: the OS can fire a
      // token-refresh callback at any time, including mid-logout.
      if (auth.isSigningOut.current) return;
      registerToken(token);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [auth.status, auth.user?.extensionReady]);

  // Seed / keep remainingSeconds in sync with the account's balance
  // whenever no real PSTN call is actively counting it down (fires on
  // sign-in/out, on refreshMe() balance updates, and whenever callStatus
  // returns to 'idle' after any call ends). The placeCall response
  // overwrites it with the per-call budget once a real PSTN call starts.
  useEffect(() => {
    if (callStatus !== 'idle' || realCallActiveRef.current) return;
    setRemainingSeconds(auth.status === 'signedIn' ? auth.user?.remainingSeconds ?? null : null);
  }, [auth.status, auth.user?.remainingSeconds, callStatus]);

  // Internal helper to add record and persist
  const addCallRecordInternal = useCallback((record: Omit<CallRecord, 'id'>) => {
    setCallLogs((prev) => {
      const newRecord: CallRecord = {
        ...record,
        id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      };
      const next = [newRecord, ...prev];
      appStorage.setJSON('ilubilu_call_logs', next);
      return next;
    });
  }, []);

  const deleteCallRecord = useCallback((id: string) => {
    setCallLogs((prev) => {
      const next = prev.filter((r) => r.id !== id);
      appStorage.setJSON('ilubilu_call_logs', next);
      return next;
    });
  }, []);

  const clearCallLogs = useCallback(() => {
    setCallLogs([]);
    appStorage.setJSON('ilubilu_call_logs', []);
  }, []);

  const addCustomCallRecord = useCallback(
    (record: Omit<CallRecord, 'id'>) => {
      addCallRecordInternal(record);
    },
    [addCallRecordInternal]
  );

  // Always mirrors the CURRENT auth.status — read (not depended on) by the
  // delayed PSTN balance-refresh timeout below, whose closure would
  // otherwise see whatever auth.status was at the time reportEndedRealCall
  // happened to be (re)created, not the live value 15s later. Mirrors
  // callStatusRef/engineCallStateRef's own reasoning above.
  const authStatusRef = useRef(auth.status);
  useEffect(() => {
    authStatusRef.current = auth.status;
  }, [auth.status]);
  // The delayed second auth.refreshMe() (see PSTN_BALANCE_REFRESH_DELAY_MS)
  // fired after a real PSTN call ends. Tracked in a ref so a second PSTN
  // call ending before this fires replaces the pending timer instead of
  // stacking two, and so both cleanup effects below (unmount, and auth
  // leaving 'signedIn') can cancel it outright — a stray refreshMe() firing
  // for an account this device already signed out of would be pointless at
  // best.
  const pstnRefreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (pstnRefreshTimeoutRef.current) clearTimeout(pstnRefreshTimeoutRef.current);
    };
  }, []);
  useEffect(() => {
    if (auth.status !== 'signedIn' && pstnRefreshTimeoutRef.current) {
      clearTimeout(pstnRefreshTimeoutRef.current);
      pstnRefreshTimeoutRef.current = null;
    }
  }, [auth.status]);

  // Fire-and-forget self-reporting for a real (non-simulated) call that just
  // ended, canceled, or was declined/missed — called once per outcome,
  // immediately alongside the matching addCallRecordInternal write, from
  // every real-call teardown path below. Reads activeCallKindRef
  // synchronously: 'pstn' triggers an immediate auth.refreshMe() PLUS a
  // second one PSTN_BALANCE_REFRESH_DELAY_MS later (see that constant's
  // doc), 'internal' reports to POST /api/app/calls/report as either
  // 'INTERNAL' (the app's own outgoing internal dial) or 'INBOUND' (a
  // genuine/push-woken inbound call — direction 'incoming') — the server
  // has no other way to learn about either shape of internal-SIP-layer
  // call — and null (a placement whose type was never even learned, e.g.
  // placeCall's REST call itself failing) is a deliberate no-op — nothing
  // was ever placed to report or refresh for. Gated on
  // auth.status === 'signedIn' AND !auth.isSigningOut.current so a call
  // that somehow outlives sign-out (or races the synchronous start of one)
  // never fires an authenticated request against a token that's about to be
  // (or already was) cleared. Both branches swallow their own errors: a
  // failed report/refresh must never surface as a lineError or otherwise
  // disturb the call-ended UI the way the local call-log write already
  // reliably does regardless of network state.
  const reportEndedRealCall = useCallback(
    (
      direction: 'outgoing' | 'incoming',
      peerNumber: string,
      durationSeconds: number,
      status: 'completed' | 'missed'
    ) => {
      if (auth.status !== 'signedIn' || auth.isSigningOut.current) return;
      const kind = activeCallKindRef.current;
      if (kind === 'pstn') {
        auth.refreshMe();
        if (pstnRefreshTimeoutRef.current) {
          clearTimeout(pstnRefreshTimeoutRef.current);
        }
        pstnRefreshTimeoutRef.current = setTimeout(() => {
          pstnRefreshTimeoutRef.current = null;
          if (authStatusRef.current === 'signedIn' && !auth.isSigningOut.current) {
            auth.refreshMe();
          }
        }, PSTN_BALANCE_REFRESH_DELAY_MS);
      } else if (kind === 'internal') {
        // The report endpoint's own schema caps durationSeconds at 14400 —
        // clamp client-side too so a runaway/clock-skewed duration never
        // gets rejected outright and silently drops the whole report.
        const clampedDuration = Math.min(14400, Math.max(0, durationSeconds));
        reportCall({
          kind: direction === 'incoming' ? 'INBOUND' : 'INTERNAL',
          direction,
          peerNumber,
          durationSeconds: clampedDuration,
          status,
        }).catch(() => {});
      }
    },
    [auth]
  );

  // Clear timers
  const clearTimers = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (autoConnectTimerRef.current) {
      clearTimeout(autoConnectTimerRef.current);
      autoConnectTimerRef.current = null;
    }
    if (endedTailTimerRef.current) {
      clearTimeout(endedTailTimerRef.current);
      endedTailTimerRef.current = null;
    }
  }, []);

  // Duration ticking when connected and not on hold — visible call-duration
  // display only; it intentionally pauses on hold. The PSTN countdown below
  // is a separate, independent ticker precisely because it must NOT pause.
  useEffect(() => {
    if (callStatus === 'connected' && !isOnHold) {
      timerRef.current = setInterval(() => {
        setDuration((prev) => {
          const next = prev + 1;
          durationRef.current = next;
          return next;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [callStatus, isOnHold]);

  // Independent PSTN countdown ticker: live-decrements the server-issued
  // `remainingSeconds` soft cap once a second while connected, deliberately
  // gated ONLY on callStatus (not isOnHold) — the trunk keeps billing a
  // held PSTN call, so this must keep counting down even while the visible
  // duration ticker above is paused. `realCallActiveRef`/null-`prev` checks
  // inside the tick make this a no-op for simulated and internal calls.
  useEffect(() => {
    if (callStatus !== 'connected') {
      if (remainingSecondsTimerRef.current) {
        clearInterval(remainingSecondsTimerRef.current);
        remainingSecondsTimerRef.current = null;
      }
      return;
    }
    remainingSecondsTimerRef.current = setInterval(() => {
      if (!realCallActiveRef.current) return;
      setRemainingSeconds((prev) => (prev === null ? prev : Math.max(0, prev - 1)));
    }, 1000);
    return () => {
      if (remainingSecondsTimerRef.current) {
        clearInterval(remainingSecondsTimerRef.current);
        remainingSecondsTimerRef.current = null;
      }
    };
  }, [callStatus]);

  // PSTN countdown cap: when the live-decremented remainingSeconds hits 0
  // during a connected real call, hang up automatically (the server already
  // refused placement at 0 — this is the mid-call soft cap). Independent of
  // isOnHold for the same billing reason as the ticker above.
  useEffect(() => {
    if (
      realCallActiveRef.current &&
      callStatus === 'connected' &&
      remainingSeconds !== null &&
      remainingSeconds <= 0
    ) {
      endCallRef.current();
    }
  }, [remainingSeconds, callStatus]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    return `${pad(mins)}:${pad(secs)}`;
  };

  const resetCallState = useCallback(() => {
    clearTimers();
    setIsMuted(false);
    setIsSpeakerOn(false);
    setIsOnHold(false);
    setIsVideoOn(false);
    setIsInCallKeypadOpen(false);
    setIsMinimized(false);
    setDuration(0);
    durationRef.current = 0;
    setRemainingSeconds(null);
  }, [clearTimers]);

  // Shared "Call Ended" badge → idle tail, used by every hang-up / decline /
  // cancel path. Always clears any previously-scheduled tail first, so a
  // fast-follow event (e.g. a genuine inbound call preempting mid-tail, or a
  // second cancel racing the first) can never leave two tails in flight —
  // which would otherwise let a stale one fire later and wipe out whatever
  // state the second event set up.
  const scheduleEndedTail = useCallback(
    (ms: number) => {
      if (endedTailTimerRef.current) {
        clearTimeout(endedTailTimerRef.current);
      }
      endedTailTimerRef.current = setTimeout(() => {
        endedTailTimerRef.current = null;
        setCallStatus('idle');
        resetCallState();
      }, ms);
    },
    [resetCallState]
  );

  // Cleanup for the push-wait state armed by startPushWait (below). Must be
  // called from EVERY exit out of that state: the mapping effect resolving
  // it once the engine reaches "incoming" for real, the 30s push-wait
  // timeout giving up, and declineCall/endCall's engine-idle local-cancel
  // branches (the same branches that already exist to cancel a not-yet-
  // arrived PSTN agent leg — see startCall's cancelUnplacedRealCall). Only
  // clears push-wait-owned bookkeeping; callers are responsible for
  // whatever else their particular exit needs (realCallActiveRef,
  // callStatus, notification cancellation, logging).
  const clearPushWait = useCallback(() => {
    if (pushWaitTimeoutRef.current) {
      clearTimeout(pushWaitTimeoutRef.current);
      pushWaitTimeoutRef.current = null;
    }
    pushWaitActiveRef.current = false;
    pushAnswerPendingRef.current = false;
    pushWaitCallIdRef.current = null;
    pushWaitCallerRef.current = null;
    // Invalidate any already-scheduled 30s timeout closure even in the
    // (should-be-impossible, but defensive) case the clearTimeout() above
    // didn't actually stop it from running — see pushWaitGenRef's own doc.
    pushWaitGenRef.current += 1;
  }, []);

  // Belt-and-suspenders unmount safety net: a plain setTimeout is not tied
  // to CallProvider's lifecycle, so if the provider itself unmounts while a
  // push-wait timeout is pending (fast refresh, an unusual top-level
  // remount), this stops it from firing into a torn-down closure later.
  useEffect(() => {
    return () => {
      if (pushWaitTimeoutRef.current) clearTimeout(pushWaitTimeoutRef.current);
    };
  }, []);

  // Start outgoing call. When the real engine is registered this places a
  // real call (internal SIP dial or PSTN REST place); otherwise it falls
  // back to today's simulated auto-connect so the Test Call / Expo Go demo
  // flows stay demoable.
  const startCall = useCallback(
    (newCaller?: Partial<CallerInfo>) => {
      // A real inbound call is currently ringing — the UI shouldn't allow
      // dialing out on top of it in the first place, but guard here too:
      // proceeding would arm a queue entry/placement that races the
      // still-unanswered inbound session, and sip-engine's busy-486 guard
      // would silently reject whichever leg loses, leaving this attempt
      // stuck 'outgoing' forever. Bail out before touching any state so
      // the ringing call's own UI is left completely undisturbed. Also
      // covers a push-wait (pushWaitActiveRef) — the engine itself still
      // reads 'idle' during that window (no SIP session yet), so the
      // 'incoming' check alone wouldn't catch it, but dialing out would
      // still stomp the push-wait's caller/callStatus exactly the same way.
      if (engineCallStateRef.current === 'incoming' || pushWaitActiveRef.current) return;

      const canPlaceRealCall = engine.supported && engine.registered;

      // Real build, line not registered (unprovisioned/unverified account,
      // creds still propagating, or socket down): do NOT fake a call —
      // surface why and bail while still idle, so the calling modal never
      // flashes open for a dial that can't happen. The simulated demo call
      // survives only where real calling is impossible anyway (Expo Go /
      // web, engine.supported === false) — see the branch further down.
      if (!canPlaceRealCall && engine.supported) {
        setLineError(
          engine.registrationError ??
            (auth.user?.extensionReady
              ? 'Your line is not connected yet. Trying to reconnect…'
              : 'Your line is still being set up — calling will be available in a moment.')
        );
        // Opportunistic retry: reopens the credential loop's polling window.
        setCredentialRetryTick((t) => t + 1);
        return;
      }

      resetCallState();
      initialDirectionRef.current = 'outgoing';
      const callerInfo: CallerInfo = {
        ...DEFAULT_CALLER,
        ...(newCaller || {}),
      };
      setCaller(callerInfo);
      setCallStatus('outgoing');
      setLineError(null);

      if (!canPlaceRealCall) {
        // Expo Go / web: real calling is impossible here — keep the demo
        // auto-connect so the Test Call flow stays demoable.
        setLineError(engine.registrationError || 'Real calling needs the ilubilu dev build.');
        // Auto connect after 2.4 seconds for smooth realistic preview
        autoConnectTimerRef.current = setTimeout(() => {
          setCallStatus('connected');
        }, 2400);
        return;
      }

      realCallActiveRef.current = true;
      // Reset for THIS attempt — cancelUnplacedRealCall's catch-path below
      // (placeCall's REST call itself rejecting, before .then() ever runs)
      // would otherwise still see a previous call's leftover kind/selxCallId
      // and misreport this brand-new, never-placed attempt.
      activeCallKindRef.current = null;
      activeSelxCallIdRef.current = null;
      const attemptId = ++callAttemptIdRef.current;
      const number = toDialableNumber(callerInfo.number);

      // Arm the agent-leg queue BEFORE the REST call: if the server places a
      // PSTN call, its agent-leg INVITE (to this same line) must be
      // auto-answered instead of surfacing as a genuine inbound call. If the
      // response turns out to be "internal", cancelExpectedAgentLeg() below
      // pops that queue entry back off before dialing directly.
      engine.markOutgoingCallPlaced();

      // Local-only cancel path for when there's no SIP session to hang up
      // yet (still racing the REST response / the agent-leg INVITE) — used
      // both by an immediate cancel (endCall/declineCall's real branch) and
      // by the placement watchdog below. Always disarms the agent-leg queue
      // AND hangs up (both safe no-ops if nothing is actually live) BEFORE
      // clearing realCallActiveRef — otherwise a PSTN agent-leg INVITE that
      // still arrives within the 8s window after this "cancel" would get
      // auto-answered with the mic open while the UI already shows idle,
      // and the mapping effect would ignore it outright (ref already false).
      const cancelUnplacedRealCall = (type: 'outgoing' | 'missed', errorMessage?: string) => {
        engine.cancelExpectedAgentLeg();
        engine.hangup();
        callAttemptIdRef.current++;
        realCallActiveRef.current = false;
        if (errorMessage) setLineError(errorMessage);
        addCallRecordInternal({
          name: callerInfo.name,
          number: callerInfo.number,
          type,
          time: formatCurrentTime(),
          section: 'Today',
          label: callerInfo.label || 'Mobile',
          duration: type === 'outgoing' ? 'Canceled' : undefined,
          avatarColor: callerInfo.avatarColor || (type === 'outgoing' ? '#8B5CF6' : '#F43F5E'),
          timestamp: Date.now(),
          selxCallId: activeSelxCallIdRef.current ?? undefined,
        });
        reportEndedRealCall(initialDirectionRef.current, callerInfo.number, 0, 'missed');
        setCallStatus('ended');
        scheduleEndedTail(700);
      };

      placeCall(number)
        .then((result: PlaceCallResult) => {
          if (callAttemptIdRef.current !== attemptId) return; // superseded by a newer call
          if (result.type === 'internal') {
            activeCallKindRef.current = 'internal';
            engine.cancelExpectedAgentLeg();
            engine.call(result.extension);
          } else {
            activeCallKindRef.current = 'pstn';
            activeSelxCallIdRef.current = result.call.call_id;
            setRemainingSeconds(result.remainingSeconds);
            // Arms the mapping effect's auto-answer window for this PSTN
            // call's agent-leg INVITE — mirrors sip-engine's own internal
            // AGENT_LEG_WINDOW_MS (not exported, so duplicated here as a
            // literal); see agentLegWindowUntilRef's declaration above.
            agentLegWindowUntilRef.current = Date.now() + AGENT_LEG_AUTO_ANSWER_WINDOW_MS;
            // Placement watchdog: if the agent-leg INVITE never arrives
            // (dead trunk, server-side failure after accepting the REST
            // call, etc.), the engine will sit at "idle" forever and
            // endCall/hangup() would be a no-op with no session to
            // terminate — a call stuck 'outgoing' locally that could still
            // auto-answer and bill later. Cancel it locally after 25s.
            setTimeout(() => {
              if (
                callAttemptIdRef.current === attemptId &&
                realCallActiveRef.current &&
                engineCallStateRef.current === 'idle'
              ) {
                cancelUnplacedRealCall('outgoing', 'The call could not be connected.');
              }
            }, PSTN_PLACEMENT_WATCHDOG_MS);
          }
        })
        .catch((err: unknown) => {
          if (callAttemptIdRef.current !== attemptId) return; // superseded by a newer call
          // cancelUnplacedRealCall() itself disarms the agent-leg queue —
          // do not also call engine.cancelExpectedAgentLeg() here, or a
          // single armed entry would get popped twice (the second pop
          // stealing an unrelated call's queue slot).
          cancelUnplacedRealCall('outgoing', err instanceof ApiError ? err.message : 'Could not place the call.');
        });
    },
    [resetCallState, engine, addCallRecordInternal, scheduleEndedTail, reportEndedRealCall, auth.user?.extensionReady]
  );

  // Simulate an incoming call
  const receiveIncomingCall = useCallback(
    (newCaller?: Partial<CallerInfo>) => {
      resetCallState();
      initialDirectionRef.current = 'incoming';
      setCaller({
        ...DEFAULT_CALLER,
        ...(newCaller || {}),
      });
      setCallStatus('incoming');
    },
    [resetCallState]
  );

  // Push-woken answer/decline entry point: both the cold-start
  // getInitialPushAction() check and the foreground push listeners (both
  // wired up below) funnel their 'answer'/'opened' actions through here.
  // Genuine-inbound-shaped (realCallActiveRef=true, callStatus='incoming')
  // but there is no SIP session yet — that's the whole reason a push
  // exists. Deliberately does NOT touch agentLegWindowUntilRef: this is
  // never our own agent leg, always a genuine third-party inbound call.
  const startPushWait = useCallback(
    (action: 'answer' | 'opened', data: IncomingPushData) => {
      if (engineCallStateRef.current !== 'idle') {
        // A push-wait only ever makes sense while there's no SIP session at
        // all — handleIncomingCallAction/onIncomingPush (the only current
        // callers) already switch on engineCallStateRef themselves before
        // reaching here, so this is a defensive backstop against ever
        // hijacking a call the engine is already driving ('incoming',
        // 'connecting', 'in-call', or still wrapping up as 'ended'). Never
        // touch caller/callStatus/realCallActiveRef/resetCallState in that
        // case — just make sure the notification doesn't linger.
        cancelIncomingCallNotification();
        return;
      }
      if (pushWaitActiveRef.current && pushWaitCallIdRef.current === data.callId) {
        // Duplicate event for the call we're already waiting on (e.g. the
        // raw FCM data message AND a notification-action press for the same
        // call both arriving). Only ever upgrade a recorded 'opened' to
        // 'answer', never downgrade an already-recorded Answer. Leaves the
        // already-scheduled timeout (and its gen) alone — this isn't a new
        // wait.
        if (action === 'answer') pushAnswerPendingRef.current = true;
        return;
      }
      if (realCallActiveRef.current) {
        // engineCallStateRef.current is 'idle' (checked above) but a real
        // call is still in progress by our OWN bookkeeping — e.g. an
        // outgoing PSTN placement (startCall) sits 'idle' for the whole
        // REST-call + trunk-dial window before its agent-leg INVITE ever
        // arrives. Arming a push-wait on top of that would stomp its
        // caller/callStatus and, if later declined, skip the agent-leg
        // disarm that placement still needs (declineCall/endCall's
        // push-wait branch deliberately does NOT call
        // cancelExpectedAgentLeg()) — leaving that placement's real INVITE
        // free to auto-answer later with the mic open and no UI showing
        // it. Never touch state here; just make sure the notification
        // doesn't linger.
        cancelIncomingCallNotification();
        return;
      }
      // Wipe any pending "ended" -> "idle" tail FIRST, same convention as
      // the genuine-inbound branch in the mapping effect below — a stale
      // tail firing mid-wait must not stomp the incoming state we're about
      // to set up 600-700ms from now.
      if (endedTailTimerRef.current) {
        clearTimeout(endedTailTimerRef.current);
        endedTailTimerRef.current = null;
      }
      const matched = matchCallerFromIdentity(data.caller);
      realCallActiveRef.current = true;
      initialDirectionRef.current = 'incoming';
      resetCallState();
      // Known up front for a push-woken call, unlike a genuine (non-pushed)
      // inbound SIP call — captured into activeSelxCallIdRef (not just
      // pushWaitCallIdRef) because it must survive clearPushWait() and stay
      // readable all the way to whenever this call eventually ends.
      activeCallKindRef.current = 'internal';
      activeSelxCallIdRef.current = data.callId;
      setCaller(matched);
      setCallStatus('incoming');
      setLineError(null);
      pushAnswerPendingRef.current = action === 'answer';
      pushWaitActiveRef.current = true;
      pushWaitCallIdRef.current = data.callId;
      pushWaitCallerRef.current = matched;

      if (pushWaitTimeoutRef.current) clearTimeout(pushWaitTimeoutRef.current);
      pushWaitGenRef.current += 1;
      const gen = pushWaitGenRef.current;
      pushWaitTimeoutRef.current = setTimeout(() => {
        pushWaitTimeoutRef.current = null;
        // Bail unless this timeout is still the current wait's timeout AND
        // that wait is still active AND the UI is still actually showing it
        // — any of these having moved on (resolved by the mapping effect,
        // cancelled by decline/end, or superseded by a newer wait) means
        // there's nothing left for this stale callback to do.
        if (gen !== pushWaitGenRef.current) return;
        if (!pushWaitActiveRef.current) return;
        if (callStatusRef.current !== 'incoming') return;
        const missedCaller = pushWaitCallerRef.current;
        clearPushWait();
        cancelIncomingCallNotification();
        realCallActiveRef.current = false;
        if (missedCaller) {
          addCallRecordInternal({
            name: missedCaller.name,
            number: missedCaller.number,
            type: 'missed',
            time: formatCurrentTime(),
            section: 'Today',
            label: missedCaller.label || 'Mobile',
            avatarColor: missedCaller.avatarColor || '#F43F5E',
            timestamp: Date.now(),
            selxCallId: activeSelxCallIdRef.current ?? undefined,
          });
          reportEndedRealCall('incoming', missedCaller.number, 0, 'missed');
        }
        setCallStatus('idle');
        resetCallState();
        setLineError("Missed call — couldn't connect in time.");
      }, PUSH_WAIT_TIMEOUT_MS);
    },
    [resetCallState, addCallRecordInternal, clearPushWait, reportEndedRealCall]
  );

  // Accept incoming call
  const acceptCall = useCallback(() => {
    dismissIncomingCallNotification();
    cancelIncomingCallNotification();
    if (realCallActiveRef.current) {
      if (pushWaitActiveRef.current) {
        // Still push-waiting — no SIP session exists yet, so
        // engine.answerIncoming() below would be a silent no-op (nothing to
        // answer). Remember the user's tap so the mapping effect's
        // push-wait resolution auto-answers the instant the real session
        // shows up, instead of swallowing it.
        pushAnswerPendingRef.current = true;
        return;
      }
      // The engine-state-mapping effect flips callStatus to 'connected' once
      // the session actually reaches "in-call".
      engine.answerIncoming();
      return;
    }
    clearTimers();
    setCallStatus('connected');
    setDuration(0);
    durationRef.current = 0;
  }, [clearTimers, engine]);

  // Decline incoming call
  const declineCall = useCallback(() => {
    dismissIncomingCallNotification();
    cancelIncomingCallNotification();
    if (realCallActiveRef.current) {
      if (engine.callState === 'idle') {
        // No SIP session exists yet. Two different things can put us here,
        // and they must NOT share the agent-leg/callAttemptId bookkeeping:
        if (pushWaitActiveRef.current) {
          // A push-wait declined before its real INVITE ever arrived (see
          // startPushWait) — this was never an outgoing placement: no
          // agent-leg queue entry was ever armed for it, and it never
          // bumped callAttemptIdRef (both belong solely to startCall's own
          // placement bookkeeping), so don't touch either — doing so would
          // cross-contaminate a genuinely in-flight outgoing placement's
          // watchdog/queue state.
          clearPushWait();
        } else {
          // Still racing the REST call / agent-leg INVITE (startCall's own
          // outgoing placement) — engine.declineIncoming() would be a no-op
          // with nothing to terminate. Disarm the agent-leg queue AND hang
          // up (both safe no-ops if nothing is actually live) BEFORE
          // clearing the ref, so a PSTN agent-leg INVITE that still arrives
          // afterward can't get auto-answered with the mic open while the
          // UI already shows idle.
          engine.cancelExpectedAgentLeg();
          engine.hangup();
          callAttemptIdRef.current++;
        }
        realCallActiveRef.current = false;
        addCallRecordInternal({
          name: caller.name,
          number: caller.number,
          type: 'missed',
          time: formatCurrentTime(),
          section: 'Today',
          label: caller.label || 'Mobile',
          avatarColor: caller.avatarColor || '#F43F5E',
          timestamp: Date.now(),
          selxCallId: activeSelxCallIdRef.current ?? undefined,
        });
        reportEndedRealCall(initialDirectionRef.current, caller.number, 0, 'missed');
        setCallStatus('ended');
        scheduleEndedTail(600);
        return;
      }
      // A real SIP session already exists. clearPushWait() here is a
      // defensive no-op — a push-wait always resolves (see the mapping
      // effect) the instant the engine leaves "idle", so pushWaitActiveRef
      // should already be false by the time a real session exists — but
      // costs nothing to guarantee. The engine-state-mapping effect writes
      // the missed-call log entry once the session reaches "ended" (same
      // path a remote-side hangup takes, so there's exactly one place that
      // logs a real call's outcome).
      clearPushWait();
      engine.declineIncoming();
      return;
    }
    clearTimers();
    // Record missed/declined call in call history
    addCallRecordInternal({
      name: caller.name,
      number: caller.number,
      type: 'missed',
      time: formatCurrentTime(),
      section: 'Today',
      label: caller.label || 'Mobile',
      avatarColor: caller.avatarColor || '#F43F5E',
      timestamp: Date.now(),
    });
    setCallStatus('ended');
    scheduleEndedTail(600);
  }, [clearTimers, caller, addCallRecordInternal, engine, scheduleEndedTail, clearPushWait, reportEndedRealCall]);

  // End active or outgoing call
  const endCall = useCallback(() => {
    dismissIncomingCallNotification();
    cancelIncomingCallNotification();
    if (realCallActiveRef.current) {
      if (engine.callState === 'idle') {
        // No SIP session exists yet. Two different things can put us here,
        // and they must NOT share the agent-leg/callAttemptId bookkeeping,
        // nor the same call-log shape (mirrors declineCall's own split):
        if (pushWaitActiveRef.current) {
          // A push-wait being torn down via "End" before its real INVITE
          // arrived (see startPushWait) — never an outgoing placement, so
          // skip the agent-leg queue disarm and callAttemptIdRef bump
          // (startCall-only bookkeeping). Log it the same way declineCall
          // would (a missed call), not as a canceled outgoing placement —
          // this was an inbound call, however it was ended.
          clearPushWait();
          realCallActiveRef.current = false;
          addCallRecordInternal({
            name: caller.name,
            number: caller.number,
            type: 'missed',
            time: formatCurrentTime(),
            section: 'Today',
            label: caller.label || 'Mobile',
            avatarColor: caller.avatarColor || '#F43F5E',
            timestamp: Date.now(),
            selxCallId: activeSelxCallIdRef.current ?? undefined,
          });
          reportEndedRealCall(initialDirectionRef.current, caller.number, 0, 'missed');
          setCallStatus('ended');
          scheduleEndedTail(700);
          return;
        }
        // Still mid-placement — the REST call resolved but the agent-leg
        // INVITE hasn't arrived, or an internal call's engine.call() hasn't
        // produced a session yet — engine.hangup() would be a no-op with
        // nothing to terminate, leaving the call stuck 'outgoing' and able
        // to connect/bill later. Disarm the agent-leg queue AND hang up
        // (both safe no-ops if nothing is actually live) BEFORE clearing
        // the ref, so a PSTN agent-leg INVITE that still arrives afterward
        // can't get auto-answered with the mic open while the UI already
        // shows idle.
        engine.cancelExpectedAgentLeg();
        engine.hangup();
        callAttemptIdRef.current++;
        realCallActiveRef.current = false;
        addCallRecordInternal({
          name: caller.name,
          number: caller.number,
          type: 'outgoing',
          time: formatCurrentTime(),
          section: 'Today',
          label: caller.label || 'Mobile',
          duration: 'Canceled',
          avatarColor: caller.avatarColor || '#8B5CF6',
          timestamp: Date.now(),
          selxCallId: activeSelxCallIdRef.current ?? undefined,
        });
        reportEndedRealCall(initialDirectionRef.current, caller.number, 0, 'missed');
        setCallStatus('ended');
        scheduleEndedTail(700);
        return;
      }
      // A real SIP session already exists. clearPushWait() here is a
      // defensive no-op — see declineCall's identical comment. The
      // engine-state-mapping effect writes the call-log entry (with the
      // real duration from the existing ticker) once the session reaches
      // "ended".
      clearPushWait();
      engine.hangup();
      return;
    }
    clearTimers();
    const currentDur = durationRef.current;
    if (callStatus === 'connected') {
      addCallRecordInternal({
        name: caller.name,
        number: caller.number,
        type: initialDirectionRef.current === 'incoming' ? 'incoming' : 'outgoing',
        time: formatCurrentTime(),
        section: 'Today',
        label: caller.label || 'Mobile',
        duration: formatDurationShort(currentDur),
        avatarColor: caller.avatarColor || '#3B82F6',
        timestamp: Date.now(),
      });
    } else if (callStatus === 'outgoing') {
      addCallRecordInternal({
        name: caller.name,
        number: caller.number,
        type: 'outgoing',
        time: formatCurrentTime(),
        section: 'Today',
        label: caller.label || 'Mobile',
        duration: 'Canceled',
        avatarColor: caller.avatarColor || '#8B5CF6',
        timestamp: Date.now(),
      });
    }

    setCallStatus('ended');
    scheduleEndedTail(700);
  }, [clearTimers, callStatus, caller, addCallRecordInternal, engine, scheduleEndedTail, clearPushWait, reportEndedRealCall]);

  // Keep endCallRef current so effects declared earlier in the file (the
  // PSTN countdown-to-zero effect) can always invoke the latest endCall.
  useEffect(() => {
    endCallRef.current = endCall;
  }, [endCall]);

  // Routes an 'answer'/'opened' push action (from cold start or a
  // foreground notification-action press — both funnel through here) to
  // wherever the real call actually is right now.
  const handleIncomingCallAction = useCallback(
    (action: 'answer' | 'opened', data: IncomingPushData) => {
      const engineState = engineCallStateRef.current;
      if (engineState === 'incoming') {
        // The real SIP INVITE already beat the push/notification-action —
        // the genuine-inbound branch in the mapping effect below has
        // already put up the ring UI (or, if this is itself resolving a
        // push-wait, the mapping effect already resolved it). Just cancel
        // the notification (no double ring) and, for an explicit Answer,
        // accept immediately.
        cancelIncomingCallNotification();
        if (action === 'answer') engine.answerIncoming();
        return;
      }
      if (engineState !== 'idle') {
        // 'in-call' / 'connecting' / 'ended' — a real call (ours, placed or
        // answered some other way, or one that's still wrapping up) already
        // occupies the line. This push/notification-action is stale or for
        // some overlapping event; never let it reset caller/callStatus/
        // realCallActiveRef out from under a call that's actually live.
        // Just make sure the notification doesn't linger.
        cancelIncomingCallNotification();
        return;
      }
      startPushWait(action, data);
    },
    [engine, startPushWait]
  );

  // Raw FCM data-message arrival while the app is foreground (no
  // notification-action press yet — that's onNotificationAction below).
  const onIncomingPush = useCallback(
    (data: IncomingPushData) => {
      const engineState = engineCallStateRef.current;
      if (engineState === 'incoming') {
        // SIP socket beat the push — no double ring, nothing else to do.
        cancelIncomingCallNotification();
        return;
      }
      if (engineState !== 'idle') {
        // 'in-call' / 'connecting' / 'ended' — a real call already occupies
        // the line; never hijack it with a push-wait reset. Just make sure
        // the notification doesn't linger.
        cancelIncomingCallNotification();
        return;
      }
      // Engine is genuinely idle: drive the same push-wait state as cold
      // start. The app is foreground, so no local notification needs
      // displaying (displayIncomingCallNotification is the killed-state
      // path only). No explicit user action has happened yet — 'opened'
      // (not answer-pending) — a later notification-action press for this
      // same callId can still upgrade this via startPushWait's own dedup
      // check.
      startPushWait('opened', data);
    },
    [startPushWait]
  );

  // Foreground notification-action press (Answer/Decline button, or a body
  // press) — the same push notification the killed-state background
  // handler displayed, but the app is now foreground so notifee delivers it
  // here instead of to the background event handler.
  const onNotificationAction = useCallback(
    (pushAction: PushCallAction) => {
      if (pushAction.action === 'decline') {
        if (realCallActiveRef.current) {
          // Covers both shapes this can be in: still push-waiting (no SIP
          // session yet — declineCall's engine-idle branch clears the
          // push-wait, cancels the notification, and logs the missed call)
          // and a real SIP session already ringing (declineCall's
          // engine.declineIncoming() branch). Background-only decline
          // (app not foreground) is handled entirely by Task 3's
          // onBackgroundEvent — this is only reached while foreground.
          declineCall();
        } else {
          cancelIncomingCallNotification();
        }
        return;
      }
      handleIncomingCallAction(pushAction.action, pushAction.data);
    },
    [declineCall, handleIncomingCallAction]
  );

  // Always-current refs for the three push callbacks above, so the
  // foreground-listener effect further down (see addForegroundPushListeners)
  // can register its listeners ONCE per sign-in instead of tearing down and
  // rebuilding them on every render — mirrors endCallRef's own convention.
  // engine (and therefore any callback depending on it) gets a fresh object
  // identity every render (see useSipEngine — a plain object literal, not
  // memoized), so depending on onIncomingPush/onNotificationAction directly
  // in that effect's dependency array would resubscribe the native
  // notifee/messaging listeners on every single render (e.g. every second
  // of ticking call duration).
  const onIncomingPushRef = useRef(onIncomingPush);
  useEffect(() => {
    onIncomingPushRef.current = onIncomingPush;
  }, [onIncomingPush]);
  const onNotificationActionRef = useRef(onNotificationAction);
  useEffect(() => {
    onNotificationActionRef.current = onNotificationAction;
  }, [onNotificationAction]);
  const handleIncomingCallActionRef = useRef(handleIncomingCallAction);
  useEffect(() => {
    handleIncomingCallActionRef.current = handleIncomingCallAction;
  }, [handleIncomingCallAction]);

  // Cold-start check: was this app instance woken by the user answering/
  // opening the incoming-call push notification? Gated on isPushSupported()
  // the same way the push-token-registration effect above is (Android
  // dev-client/production build only) — getInitialPushAction/
  // addForegroundPushListeners already no-op on unsupported platforms, but
  // gating here keeps this effect's intent explicit and matches that
  // effect's own style. initialPushCheckedRef ensures the (idempotent)
  // native read only actually runs once per app session even though this
  // effect can re-fire whenever auth.status changes (e.g. a sign-out then
  // sign-in back in shouldn't replay a stale cold-start action).
  useEffect(() => {
    if (auth.status !== 'signedIn' || !isPushSupported() || initialPushCheckedRef.current) return;
    initialPushCheckedRef.current = true;
    getInitialPushAction().then((initial) => {
      if (!initial || initial.action === 'decline') {
        // decline never actually cold-starts the app (see
        // incoming-push-service.ts — no launchActivity on decline), but a
        // notification can still be left displayed either way; make sure
        // it doesn't linger.
        cancelIncomingCallNotification();
        return;
      }
      handleIncomingCallActionRef.current(initial.action, initial.data);
    });
  }, [auth.status]);

  // Foreground push listeners — only meaningful once signed in (an incoming
  // call for an account this device isn't signed into shouldn't ring it).
  // Torn down on sign-out; re-subscribing only on auth.status changes (not
  // on every render) is exactly why the callbacks are read through the refs
  // above instead of being listed directly as dependencies here.
  useEffect(() => {
    if (auth.status !== 'signedIn' || !isPushSupported()) return;
    const unsubscribe = addForegroundPushListeners({
      onIncomingPush: (data) => onIncomingPushRef.current(data),
      onNotificationAction: (a) => onNotificationActionRef.current(a),
    });
    return unsubscribe;
  }, [auth.status]);

  // --- Real engine call-state mapping -------------------------------------
  // Applies ONLY while realCallActiveRef.current is true (a real call we
  // placed/answered, or a genuine inbound SIP call) so the simulated Test
  // Call / notification / deep-link flows keep driving callStatus untouched
  // whenever no real call is in progress.
  useEffect(() => {
    const prev = prevEngineCallStateRef.current;
    const next = engine.callState;
    prevEngineCallStateRef.current = next;
    if (prev === next) return;

    if (next === 'incoming') {
      if (realCallActiveRef.current && Date.now() <= agentLegWindowUntilRef.current) {
        if (pushWaitActiveRef.current) {
          // A push-wait means THIS "incoming" is the push-announced genuine
          // inbound call we've been waiting on, never our own agent leg —
          // even though we happen to still be inside a stale agent-leg
          // window left over from an unrelated earlier PSTN placement.
          // Resolve the push-wait instead of blindly auto-answering it as
          // if it were our own leg (that would silently answer a stranger's
          // call with the mic open). Read pushAnswerPendingRef BEFORE
          // clearPushWait() wipes it.
          const wasAnswerPending = pushAnswerPendingRef.current;
          clearPushWait();
          cancelIncomingCallNotification();
          if (wasAnswerPending) {
            engine.answerIncoming();
          }
          // Else: leave the ring UI as-is (callStatus/caller were already
          // set by startPushWait) — same "user still taps Accept" case as
          // the genuine-inbound branch below.
          agentLegWindowUntilRef.current = 0;
          return;
        }
        // A stray "incoming" while we're already driving a real call, still
        // within the window armed for our own PSTN agent-leg INVITE (see
        // startCall) — almost certainly our own leg arriving just past
        // sip-engine's internal AGENT_LEG_WINDOW_MS and getting
        // misclassified as genuine inbound. Auto-answer it rather than
        // surface a spurious incoming call for a call the user themself
        // placed. Outside this window, fall through to the genuine-inbound
        // handling below and let it ring normally instead of blindly
        // auto-answering forever: sip-engine's own busy-486 reject (see
        // useSipEngine's newRTCSession handler) already guarantees this
        // branch is only reachable when there's no actually-live session
        // left to orphan — a real second call while genuinely mid-call gets
        // rejected at the SIP layer before callState ever changes.
        engine.answerIncoming();
        // Consumed — disarm so a LATER stray "incoming" (e.g. a stranger's
        // INVITE landing during this same call's 1.2s ended-tail) can't
        // still ride this same window and get auto-answered too.
        agentLegWindowUntilRef.current = 0;
        // Defensive no-op outside the push-wait case above (pushWaitActiveRef
        // is already false here) — see clearPushWait's own doc for why every
        // exit calls it regardless.
        clearPushWait();
        return;
      }
      // Genuine inbound call (including a late/expired agent-leg window
      // case above — see the comment there for why that's safe). A real
      // call already in progress keeps realCallActiveRef true all the way
      // through its "ended" tail (only cleared once the engine reaches
      // "idle" below), so reaching this branch otherwise can only mean a
      // *simulated* call (Test Call / notification / deep link) or nothing
      // at all is active — preempt whichever it is (resetCallState() below
      // clears any simulated timers/flags) rather than silently dropping
      // the real incoming call.
      //
      // Explicitly wipe any pending ended→idle tail FIRST, before touching
      // any other state: a call that was mid-tail (e.g. the previous real
      // call's 700ms "ended" badge still showing) must not have that stale
      // timer fire 700ms from now and stomp the incoming state we're about
      // to set. resetCallState()'s own clearTimers() call below would catch
      // this too, but doing it explicitly up front removes any ordering
      // dependency on that.
      if (endedTailTimerRef.current) {
        clearTimeout(endedTailTimerRef.current);
        endedTailTimerRef.current = null;
      }
      realCallActiveRef.current = true;
      initialDirectionRef.current = 'incoming';
      resetCallState();
      if (!pushWaitActiveRef.current) {
        // A genuine inbound call with no preceding push-wait — no known
        // selxCallId. When a push-wait IS active, activeCallKindRef/
        // activeSelxCallIdRef were already set by startPushWait at wait
        // start and must be left alone here; the push-wait resolution below
        // (reading pushWaitActiveRef again) never touches either ref.
        activeCallKindRef.current = 'internal';
        activeSelxCallIdRef.current = null;
      }
      const identity = engine.remoteIdentity || 'Unknown';
      setCaller(matchCallerFromIdentity(identity));
      setCallStatus('incoming');
      if (pushWaitActiveRef.current) {
        // Resolves a push-wait (see startPushWait): the real SIP INVITE
        // finally landed. Read pushAnswerPendingRef BEFORE clearPushWait()
        // wipes it. Either way, cancel the notification — the lockscreen/
        // heads-up ring is no longer needed now that the app itself has a
        // live session and is showing the call screen.
        const wasAnswerPending = pushAnswerPendingRef.current;
        clearPushWait();
        cancelIncomingCallNotification();
        if (wasAnswerPending) {
          // User already chose Answer (lockscreen action, or a
          // notification-action press) before the session existed —
          // answer immediately instead of leaving the ring UI up.
          engine.answerIncoming();
        }
        // Else: leave the normal ring UI in place (callStatus is already
        // 'incoming' above) — the user pressed the notification body only,
        // so they still tap Accept themselves, same as any other genuine
        // inbound call.
      }
      return;
    }

    if (!realCallActiveRef.current) return;

    if (next === 'connecting') {
      // Our own agent leg got consumed via sip-engine's internal queue
      // match (not the context-layer window above) — disarm the window too
      // so a later stray "incoming" can't still ride it.
      agentLegWindowUntilRef.current = 0;
      setCallStatus('outgoing');
    } else if (next === 'in-call') {
      agentLegWindowUntilRef.current = 0;
      setDuration(0);
      durationRef.current = 0;
      setCallStatus('connected');
    } else if (next === 'ended') {
      const currentDur = durationRef.current;
      if (prev === 'in-call') {
        addCallRecordInternal({
          name: caller.name,
          number: caller.number,
          type: initialDirectionRef.current === 'incoming' ? 'incoming' : 'outgoing',
          time: formatCurrentTime(),
          section: 'Today',
          label: caller.label || 'Mobile',
          duration: formatDurationShort(currentDur),
          avatarColor: caller.avatarColor || '#3B82F6',
          timestamp: Date.now(),
          selxCallId: activeSelxCallIdRef.current ?? undefined,
        });
        reportEndedRealCall(initialDirectionRef.current, caller.number, currentDur, 'completed');
      } else if (prev === 'connecting') {
        addCallRecordInternal({
          name: caller.name,
          number: caller.number,
          type: 'outgoing',
          time: formatCurrentTime(),
          section: 'Today',
          label: caller.label || 'Mobile',
          duration: 'Canceled',
          avatarColor: caller.avatarColor || '#8B5CF6',
          timestamp: Date.now(),
          selxCallId: activeSelxCallIdRef.current ?? undefined,
        });
        reportEndedRealCall(initialDirectionRef.current, caller.number, 0, 'missed');
      } else if (prev === 'incoming') {
        addCallRecordInternal({
          name: caller.name,
          number: caller.number,
          type: 'missed',
          time: formatCurrentTime(),
          section: 'Today',
          label: caller.label || 'Mobile',
          avatarColor: caller.avatarColor || '#F43F5E',
          timestamp: Date.now(),
          selxCallId: activeSelxCallIdRef.current ?? undefined,
        });
        reportEndedRealCall(initialDirectionRef.current, caller.number, 0, 'missed');
      }
      setCallStatus('ended');
    } else if (next === 'idle') {
      // Unconditionally clear realCallActiveRef whenever the engine reaches
      // "idle", regardless of what `prev` was — any path to idle other than
      // the normal ended→idle tail (a back-to-back inbound landing inside
      // the engine's own 1.2s ended→idle window, an abrupt teardown, a
      // watchdog-cancelled placement, etc.) must not leave the app stuck
      // believing a real call is still active forever.
      realCallActiveRef.current = false;
      // Defensive: a push-wait should always already be resolved (via the
      // "incoming" branch above) or cancelled (decline/end) by the time the
      // engine reaches "idle" — this is belt-and-suspenders against ever
      // leaving pushAnswerPendingRef/the 30s timeout armed for a wait the
      // engine has already moved past.
      clearPushWait();
      if (prev === 'ended') {
        // Normal path: the "ended" branch above already wrote the call-log
        // entry — this is just the visible "Call Ended" badge → idle tail.
        setCallStatus('idle');
        resetCallState();
      } else if (callStatus === 'connected' || callStatus === 'outgoing' || callStatus === 'incoming') {
        // Abnormal path: the engine jumped straight to "idle" WITHOUT ever
        // passing through "ended" — e.g. a mid-call UA teardown/rebuild, or
        // useSipEngine's own defensive idle-reset on its effect cleanup.
        // Nothing else in this effect wrote a call-log entry for this call
        // (that only happens in the "ended" branch above), and nothing else
        // would ever move the UI off whatever live state it's stuck
        // showing — do both here so the call still gets logged and the UI
        // doesn't hang on 'connected'/'outgoing'/'incoming' forever.
        const currentDur = durationRef.current;
        if (callStatus === 'connected') {
          addCallRecordInternal({
            name: caller.name,
            number: caller.number,
            type: initialDirectionRef.current === 'incoming' ? 'incoming' : 'outgoing',
            time: formatCurrentTime(),
            section: 'Today',
            label: caller.label || 'Mobile',
            duration: formatDurationShort(currentDur),
            avatarColor: caller.avatarColor || '#3B82F6',
            timestamp: Date.now(),
            selxCallId: activeSelxCallIdRef.current ?? undefined,
          });
          reportEndedRealCall(initialDirectionRef.current, caller.number, currentDur, 'completed');
        } else if (callStatus === 'outgoing') {
          addCallRecordInternal({
            name: caller.name,
            number: caller.number,
            type: 'outgoing',
            time: formatCurrentTime(),
            section: 'Today',
            label: caller.label || 'Mobile',
            duration: 'Canceled',
            avatarColor: caller.avatarColor || '#8B5CF6',
            timestamp: Date.now(),
            selxCallId: activeSelxCallIdRef.current ?? undefined,
          });
          reportEndedRealCall(initialDirectionRef.current, caller.number, 0, 'missed');
        } else {
          addCallRecordInternal({
            name: caller.name,
            number: caller.number,
            type: 'missed',
            time: formatCurrentTime(),
            section: 'Today',
            label: caller.label || 'Mobile',
            avatarColor: caller.avatarColor || '#F43F5E',
            timestamp: Date.now(),
            selxCallId: activeSelxCallIdRef.current ?? undefined,
          });
          reportEndedRealCall(initialDirectionRef.current, caller.number, 0, 'missed');
        }
        setCallStatus('idle');
        resetCallState();
      }
    }
  }, [engine.callState, engine.remoteIdentity, callStatus, caller, addCallRecordInternal, resetCallState, clearPushWait, reportEndedRealCall]);

  // Mirror the engine's mute state into isMuted while a real call is active.
  useEffect(() => {
    if (realCallActiveRef.current) {
      setIsMuted(engine.muted);
    }
  }, [engine.muted]);

  // Handle an answered or declined notification
  const handleIncomingCallNotificationResponse = useCallback(
    (response: any) => {
      const actionId = response?.actionIdentifier;
      const data = response?.notification?.request?.content?.data as Partial<IncomingCallPayload> | undefined;

      if (data && data.type === 'incoming_call') {
        const callerInfo: CallerInfo = {
          name: data.name || DEFAULT_CALLER.name,
          number: data.number || DEFAULT_CALLER.number,
          label: data.label || 'Mobile',
          avatarColor: data.avatarColor || '#208AEF',
        };

        if (
          actionId === ACTION_ANSWER ||
          actionId === DEFAULT_ACTION_IDENTIFIER
        ) {
          // User picked up or tapped the notification to answer
          dismissIncomingCallNotification();
          resetCallState();
          initialDirectionRef.current = 'incoming';
          setCaller(callerInfo);
          setCallStatus('connected');
        } else if (actionId === ACTION_DECLINE) {
          // User declined from notification
          dismissIncomingCallNotification();
          addCallRecordInternal({
            name: callerInfo.name,
            number: callerInfo.number,
            type: 'missed',
            time: formatCurrentTime(),
            section: 'Today',
            label: callerInfo.label || 'Mobile',
            avatarColor: callerInfo.avatarColor || '#F43F5E',
            timestamp: Date.now(),
          });
        }
      }
    },
    [addCallRecordInternal, resetCallState]
  );

  // Handle incoming deep link URLs (e.g. ilubilucall://call?action=answer&name=...)
  const handleDeepLinkUrl = useCallback(
    (url: string) => {
      try {
        const parsed = Linking.parse(url);
        if (parsed.path === 'call' || parsed.hostname === 'call') {
          const action = parsed.queryParams?.action;
          const name = (parsed.queryParams?.name as string) || DEFAULT_CALLER.name;
          const number = (parsed.queryParams?.number as string) || DEFAULT_CALLER.number;
          const label = (parsed.queryParams?.label as string) || 'Mobile';
          const avatarColor = (parsed.queryParams?.avatarColor as string) || '#208AEF';

          const callerInfo: CallerInfo = { name, number, label, avatarColor };

          if (action === 'answer') {
            dismissIncomingCallNotification();
            resetCallState();
            initialDirectionRef.current = 'incoming';
            setCaller(callerInfo);
            setCallStatus('connected');
          } else if (action === 'incoming') {
            receiveIncomingCall(callerInfo);
          } else if (action === 'decline') {
            dismissIncomingCallNotification();
            addCallRecordInternal({
              name: callerInfo.name,
              number: callerInfo.number,
              type: 'missed',
              time: formatCurrentTime(),
              section: 'Today',
              label: callerInfo.label || 'Mobile',
              avatarColor: callerInfo.avatarColor || '#F43F5E',
              timestamp: Date.now(),
            });
          }
        }
      } catch (err) {
        console.warn('[CallContext] Error handling deep link:', err);
      }
    },
    [addCallRecordInternal, receiveIncomingCall, resetCallState]
  );

  // Cold-start & runtime listeners for notifications and deep links
  useEffect(() => {
    // 1. Initialize notification channels and categories
    setupIncomingCallNotifications();

    // 2. Check cold start notification response (app was closed/killed and user tapped Answer/notification)
    getLastNotificationResponse().then((response) => {
      if (response) {
        handleIncomingCallNotificationResponse(response);
      }
    });

    // 3. Check cold start deep link
    Linking.getInitialURL().then((initialUrl) => {
      if (initialUrl) {
        handleDeepLinkUrl(initialUrl);
      }
    });

    // 4. Runtime listener for notification responses (app backgrounded or in foreground)
    const cleanupNotifListener = addNotificationResponseListener((response) => {
      handleIncomingCallNotificationResponse(response);
    });

    // 5. Runtime listener for incoming deep links
    const linkSubscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLinkUrl(url);
    });

    return () => {
      cleanupNotifListener();
      linkSubscription.remove();
    };
  }, [handleIncomingCallNotificationResponse, handleDeepLinkUrl]);

  // Schedule a test incoming call with delay (to test closed/backgrounded app)
  const scheduleTestIncomingCall = useCallback(
    async (delaySeconds: number = 5, testCaller?: Partial<CallerInfo>) => {
      const targetCaller: CallerInfo = {
        name: testCaller?.name || DEFAULT_CALLER.name,
        number: testCaller?.number || DEFAULT_CALLER.number,
        label: testCaller?.label || DEFAULT_CALLER.label,
        avatarColor: testCaller?.avatarColor || DEFAULT_CALLER.avatarColor,
      };

      if (isNotificationsSupported()) {
        return await scheduleIncomingCallNotification(targetCaller, delaySeconds);
      } else {
        // In Expo Go on Android or web: simulate in-app incoming call after delay
        setTimeout(() => {
          receiveIncomingCall(targetCaller);
        }, Math.max(1, delaySeconds) * 1000);
        return 'in_app_simulated_' + Date.now();
      }
    },
    [receiveIncomingCall]
  );

  // toggleMute mirrors the engine's own mute state (see the effect above);
  // toggleSpeaker has no engine-side readback (setSpeaker is fire-and-forget)
  // so isSpeakerOn stays the local source of truth, with the engine driven
  // off it during a real call. toggleHold stays UI-only regardless.
  const toggleMute = useCallback(() => {
    if (realCallActiveRef.current) {
      engine.toggleMute();
    } else {
      setIsMuted((v) => !v);
    }
  }, [engine]);
  const toggleSpeaker = useCallback(() => {
    // Compute `next` first and call the (impure) engine side effect before
    // touching React state — setState updaters must stay pure.
    const next = !isSpeakerOn;
    if (realCallActiveRef.current) {
      engine.setSpeaker(next);
    }
    setIsSpeakerOn(next);
  }, [isSpeakerOn, engine]);
  const toggleHold = useCallback(() => setIsOnHold((v) => !v), []);
  const toggleVideo = useCallback(() => setIsVideoOn((v) => !v), []);
  const toggleKeypad = useCallback(
    () => setIsInCallKeypadOpen((v) => !v),
    []
  );

  // In-call keypad DTMF — only reaches the engine while a real call is
  // actually connected; a no-op otherwise (simulated calls have no session
  // to send tones on).
  const sendDtmf = useCallback(
    (tone: string) => {
      if (realCallActiveRef.current && engine.callState === 'in-call') {
        engine.sendDtmf(tone);
      }
    },
    [engine]
  );

  return (
    <CallContext.Provider
      value={{
        callStatus,
        caller,
        duration,
        formattedDuration: formatDuration(duration),
        isMuted,
        isSpeakerOn,
        isOnHold,
        isVideoOn,
        isInCallKeypadOpen,
        isMinimized,
        callLogs,
        startCall,
        receiveIncomingCall,
        acceptCall,
        declineCall,
        endCall,
        toggleMute,
        toggleSpeaker,
        toggleHold,
        toggleVideo,
        toggleKeypad,
        setIsMinimized,
        deleteCallRecord,
        clearCallLogs,
        addCustomCallRecord,
        scheduleTestIncomingCall,
        lineReady,
        lineError,
        retryLine,
        remainingSeconds,
        sendDtmf,
      }}>
      {children}
    </CallContext.Provider>
  );
}

export function useCall() {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return context;
}
