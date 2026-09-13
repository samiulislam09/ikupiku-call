/**
 * React Native port of xcall's browser SIP hook
 * (xcall/src/lib/sip.ts, `useSipClient`). Same registration/session/watchdog
 * logic, adapted for react-native-webrtc + jssip + react-native-incall-manager
 * instead of the browser's native WebRTC/`<audio>` stack. See the task-5
 * brief for the full list of RN adaptations.
 *
 * All three native libs (react-native-webrtc, jssip, react-native-incall-manager)
 * are lazy-`require`d inside the effect below so importing this module never
 * crashes on web or in Expo Go, where those native modules don't exist.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import Constants from 'expo-constants';
import type JsSIPNamespace from 'jssip';
import type { RTCSession } from 'jssip/lib/RTCSession';
import type { RTCSessionEvent } from 'jssip/lib/UA';

export type SipEngineConfig = {
  sipExtension: string;
  sipPassword: string;
  host: string; // e.g. call.selx.store
  wsUrl: string; // e.g. wss://call.selx.store/ws
  // Short-lived TURN relay credentials (see xcall's GET /api/me/softphone).
  // STUN-only ICE fails for members behind symmetric NAT / restrictive
  // firewalls. Falls back to PC_CONFIG below if omitted/empty.
  iceServers?: { urls: string | string[]; username?: string; credential?: string }[];
};

export type EngineCallState = 'idle' | 'connecting' | 'incoming' | 'in-call' | 'ended';

export type SipEngine = {
  supported: boolean; // false on web / Expo Go (no WebRTC natives)
  registered: boolean;
  registrationError: string | null;
  callState: EngineCallState;
  remoteIdentity: string | null; // caller's extension/number on genuine inbound
  muted: boolean;
  call: (target: string) => void; // direct SIP dial (app-to-app): sip:<target>@<host>
  markOutgoingCallPlaced: () => void; // arm agent-leg auto-answer before a PSTN REST place
  cancelExpectedAgentLeg: () => void; // undo the above when a place-call turns out to be internal
  answerIncoming: () => void;
  declineIncoming: () => void;
  hangup: () => void;
  toggleMute: () => void;
  setSpeaker: (on: boolean) => void; // InCallManager.setSpeakerphoneOn
  sendDtmf: (tone: string) => void;
};

// STUN-only fallback — only used if `config.iceServers` is missing/empty.
const PC_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

const AGENT_LEG_WINDOW_MS = 8000;
// Tracks how long the UA has been continuously unregistered before a plain
// register() is escalated to a full UA/WebSocket rebuild (reconnectGeneration).
const REBUILD_AFTER_MS = 30000;

const noop = () => {};

/** Expo Go ships no custom native modules, so react-native-webrtc/jssip/
 * react-native-incall-manager are unavailable there — only an ilubilu dev
 * build (expo-dev-client) or a production build has them compiled in.
 * `Constants.appOwnership === 'expo'` is true ONLY inside Expo Go itself —
 * dev-client and bare/standalone builds report `null` here. This is
 * deliberately NOT `Constants.executionEnvironment === "storeClient"`:
 * that enum value covers both Expo Go *and* expo-dev-client dev builds, so
 * it would have also flagged the real ilubilu dev build as unsupported. */
function isExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}

const isSupported = Platform.OS !== 'web' && !isExpoGo();

const INERT_ENGINE: SipEngine = {
  supported: false,
  registered: false,
  registrationError: 'Real calling needs the ilubilu dev build.',
  callState: 'idle',
  remoteIdentity: null,
  muted: false,
  call: noop,
  markOutgoingCallPlaced: noop,
  cancelExpectedAgentLeg: noop,
  answerIncoming: noop,
  declineIncoming: noop,
  hangup: noop,
  toggleMute: noop,
  setSpeaker: noop,
  sendDtmf: noop,
};

/** Maps JsSIP's internal `cause` strings (e.g. "SIP Failure Code") to
 * customer-readable text — the raw values name the underlying protocol and
 * must never reach the UI as-is. */
function friendlyRegistrationError(JsSIP: typeof JsSIPNamespace, cause: string | undefined): string {
  switch (cause) {
    case JsSIP.C.causes.REQUEST_TIMEOUT:
    case JsSIP.C.causes.CONNECTION_ERROR:
      return "Couldn't connect — check your internet connection.";
    case JsSIP.C.causes.AUTHENTICATION_ERROR:
      return "Your calling line credentials aren't valid. Contact support.";
    default:
      return "Couldn't connect your calling line — retrying…";
  }
}

export function useSipEngine(config: SipEngineConfig | null): SipEngine {
  const [registered, setRegistered] = useState(false);
  const [registrationError, setRegistrationError] = useState<string | null>(null);
  const [callState, setCallState] = useState<EngineCallState>('idle');
  const [remoteIdentity, setRemoteIdentity] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  // Call-media errors — mic permission/device failures, ICE recovery
  // failures. Distinct from registrationError (SIP/WebSocket signaling);
  // folded into the single exposed `registrationError` string below since
  // SipEngine only surfaces one error slot.
  const [mediaError, setMediaError] = useState<string | null>(null);

  const uaRef = useRef<JsSIPNamespace.UA | null>(null);
  const sessionRef = useRef<RTCSession | null>(null);
  // Minimal structural type for react-native-incall-manager's default
  // export — only the members this engine actually calls.
  const inCallManagerRef = useRef<{
    start(options?: { media?: string }): void;
    stop(): void;
    setSpeakerphoneOn(on: boolean): void;
  } | null>(null);
  const inCallManagerActiveRef = useRef(false);
  const expectingAgentLegQueueRef = useRef<number[]>([]);
  // Tracks clearAfterEnd's 1200ms "ended" → "idle" transition timeout so it
  // can be cancelled if a NEW session (newRTCSession) arrives inside that
  // window — otherwise the stale timer fires 1200ms later and force-resets
  // callState to "idle" out from under whatever the new session already set
  // it to (e.g. stomping a fresh "incoming"/"connecting" back to "idle").
  const idleTransitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // RTCConfiguration for every session.answer()/call() — starts as the
  // STUN-only fallback, overwritten below once `config.iceServers` (TURN) is
  // available. A ref so call sites outside the effect (answerIncoming, call)
  // can read the current value synchronously.
  const pcConfigRef = useRef<RTCConfiguration>(PC_CONFIG);

  // Bumping this tears down and rebuilds the whole UA/WebSocket below (see
  // the watchdog inside the effect) — a full internal reconnect of just this
  // hook's SIP state, for when a stuck "Connecting…" is the WebSocket itself
  // being wedged rather than just a missed re-REGISTER (which a plain
  // ua.register() can't fix).
  const [reconnectGeneration, setReconnectGeneration] = useState(0);

  useEffect(() => {
    if (!isSupported) return;
    if (!config || !config.sipExtension || !config.sipPassword) return;

    // Lazy-required so web/Expo Go bundles never touch these native modules.
    // `isSupported` already rules out web/Expo Go, but a native build
    // missing/mismatched one of these three (e.g. a bad autolink, a
    // platform this hasn't been tested on) would otherwise throw
    // synchronously here and crash the whole app on that one line — surface
    // it as a registration error instead, the same way the "needs the dev
    // build" case already does.
    let nativeModules: {
      JsSIP: typeof JsSIPNamespace;
      InCallManager: { start(options?: { media?: string }): void; stop(): void; setSpeakerphoneOn(on: boolean): void };
    } | null = null;
    try {
      const { registerGlobals } = require('react-native-webrtc');
      registerGlobals(); // idempotent; makes RTCPeerConnection/getUserMedia available to JsSIP
      nativeModules = {
        JsSIP: require('jssip'),
        InCallManager: require('react-native-incall-manager').default,
      };
    } catch {
      setRegistrationError('Real calling is unavailable on this build.');
      return;
    }
    const { JsSIP, InCallManager } = nativeModules;
    inCallManagerRef.current = InCallManager;

    pcConfigRef.current =
      config.iceServers && config.iceServers.length > 0
        ? { iceServers: config.iceServers as RTCIceServer[] }
        : PC_CONFIG;

    const startInCallAudio = () => {
      if (inCallManagerActiveRef.current) return;
      inCallManagerActiveRef.current = true;
      try {
        InCallManager.start({ media: 'audio' });
      } catch {
        /* best-effort */
      }
    };
    const stopInCallAudio = () => {
      if (!inCallManagerActiveRef.current) return;
      inCallManagerActiveRef.current = false;
      try {
        InCallManager.stop();
      } catch {
        /* best-effort */
      }
    };

    const socket = new JsSIP.WebSocketInterface(config.wsUrl);
    const ua = new JsSIP.UA({
      sockets: [socket],
      uri: `sip:${config.sipExtension}@${config.host}`,
      password: config.sipPassword,
      register: true,
      connection_recovery_min_interval: 1,
      connection_recovery_max_interval: 6,
      register_expires: 120,
    });
    uaRef.current = ua;

    ua.on('registered', () => {
      setRegistered(true);
      setRegistrationError(null);
    });
    ua.on('unregistered', () => {
      setRegistered(false);
    });
    ua.on('registrationFailed', (e) => {
      setRegistered(false);
      if (e.response?.status_code === 403) {
        setRegistrationError(
          'This line is already connected on 2 other devices — log out from one first.',
        );
      } else {
        setRegistrationError(friendlyRegistrationError(JsSIP, e.cause));
      }
      if (
        e.cause === JsSIP.C.causes.REQUEST_TIMEOUT ||
        e.cause === JsSIP.C.causes.CONNECTION_ERROR
      ) {
        ua.stop();
        ua.start();
      }
    });
    ua.on('disconnected', () => {
      setRegistered(false);
      setRegistrationError('Reconnecting…');
    });
    ua.on('connected', () => setRegistrationError(null));

    ua.on('newRTCSession', (data: RTCSessionEvent) => {
      // Busy: a session is already live (not yet cleaned up by
      // clearAfterEnd, which nulls sessionRef.current) and a SECOND INVITE
      // just arrived — reject the NEW session immediately, at the SIP
      // level, without ever touching sessionRef/callState/remoteIdentity,
      // which still belong to the FIRST (still-live) session. Without this,
      // this handler would silently overwrite sessionRef to point at the
      // new session, orphaning whatever the first one was doing — hangup(),
      // toggleMute(), sendDtmf(), etc. all act on sessionRef.current, so the
      // live call would become uncontrollable and its mic would stay open
      // indefinitely.
      if (sessionRef.current && sessionRef.current !== data.session) {
        try {
          data.session.terminate({ status_code: 486, reason_phrase: 'Busy Here' });
        } catch {
          /* best-effort */
        }
        // A busy-rejected leg must not leave an armed agent-leg queue entry
        // behind — a LATER genuine inbound call could otherwise match it
        // and get misclassified as our own agent leg.
        expectingAgentLegQueueRef.current.length = 0;
        return;
      }

      // Cancel any pending "ended" → "idle" transition from a PREVIOUS
      // session before processing this new one — otherwise that stale
      // 1200ms timer can fire after this session has already moved
      // callState on to "incoming"/"connecting"/etc., forcing it back to
      // "idle" underneath the new call.
      if (idleTransitionTimerRef.current) {
        clearTimeout(idleTransitionTimerRef.current);
        idleTransitionTimerRef.current = null;
      }
      const session = data.session;
      const now = Date.now();
      let isOwnAgentLeg = false;
      while (expectingAgentLegQueueRef.current.length > 0) {
        const oldest = expectingAgentLegQueueRef.current.shift()!;
        if (now - oldest <= AGENT_LEG_WINDOW_MS) {
          isOwnAgentLeg = true;
          break;
        }
      }
      const isOutgoingDirect = session.direction === 'outgoing';

      sessionRef.current = session;
      const isGenuineInbound = !isOwnAgentLeg && !isOutgoingDirect;
      setRemoteIdentity(isGenuineInbound ? session.remote_identity?.uri?.user || 'Unknown' : null);
      setCallState(isGenuineInbound ? 'incoming' : 'connecting');
      setMuted(false);
      setMediaError(null);

      const clearAfterEnd = () => {
        sessionRef.current = null;
        stopInCallAudio();
        setCallState('ended');
        setMuted(false);
        if (idleTransitionTimerRef.current) {
          clearTimeout(idleTransitionTimerRef.current);
        }
        idleTransitionTimerRef.current = setTimeout(() => {
          idleTransitionTimerRef.current = null;
          setCallState('idle');
        }, 1200);
      };

      session.on('accepted', () => {
        setCallState('in-call');
        startInCallAudio();
      });
      session.on('confirmed', () => {
        setCallState('in-call');
        startInCallAudio();
      });
      session.on('ended', clearAfterEnd);
      session.on('failed', (e: { cause?: string }) => {
        // JsSIP's own cause when getUserMedia rejects (permission denied,
        // device busy/unavailable, no mic present) — otherwise
        // indistinguishable from any other call failure.
        if (e?.cause && /USER_DENIED_MEDIA_ACCESS|PERMISSION_DENIED/i.test(e.cause)) {
          setMediaError('Microphone unavailable — check app permissions.');
        }
        clearAfterEnd();
      });

      // No <audio> element on RN — react-native-webrtc routes remote audio
      // through the platform audio session automatically. Only the
      // ICE-restart recovery logic from the peerconnection listener ports
      // over.
      session.on('peerconnection', ({ peerconnection }: { peerconnection: RTCPeerConnection }) => {
        let restarted = false;
        let recoveryTimer: ReturnType<typeof setTimeout> | null = null;
        peerconnection.addEventListener('iceconnectionstatechange', () => {
          const iceState = peerconnection.iceConnectionState;
          if (iceState === 'connected' || iceState === 'completed') {
            restarted = false;
            if (recoveryTimer) {
              clearTimeout(recoveryTimer);
              recoveryTimer = null;
            }
            return;
          }
          if (iceState !== 'failed' && iceState !== 'disconnected') return;
          if (restarted) return;
          restarted = true;
          try {
            session.renegotiate?.({ rtcOfferConstraints: { iceRestart: true } });
          } catch {
            /* best-effort */
          }
          recoveryTimer = setTimeout(() => {
            const stillBad =
              peerconnection.iceConnectionState === 'failed' ||
              peerconnection.iceConnectionState === 'disconnected';
            if (stillBad) setMediaError('Call audio problem — the connection could not recover.');
          }, 10000);
        });
      });

      if (session.direction === 'incoming' && isOwnAgentLeg) {
        session.answer({ mediaConstraints: { audio: true, video: false }, pcConfig: pcConfigRef.current });
      }
    });

    ua.start();

    // A backgrounded app has its timers throttled — JsSIP's own scheduled
    // re-REGISTER can fire late enough that the SIP server has already
    // expired the registration, while the WebSocket itself stays open and
    // every handler above stays silent. Forcing a fresh register() the
    // moment the app becomes active again closes that gap; it's a harmless
    // no-op if the registration was fine all along.
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') uaRef.current?.register();
    });

    // Tracks how long the UA has been continuously unregistered — a plain
    // register() call is enough for a missed re-REGISTER, but if the
    // WebSocket itself is wedged (no error, just silently dead), only a
    // fresh socket/UA actually recovers. Reset to null the moment
    // registration succeeds again.
    let unregisteredSinceMs: number | null = null;

    const watchdog = setInterval(() => {
      if (AppState.currentState !== 'active' || !uaRef.current) return;
      if (uaRef.current.isRegistered()) {
        unregisteredSinceMs = null;
        return;
      }
      if (unregisteredSinceMs === null) {
        unregisteredSinceMs = Date.now();
        uaRef.current.register();
        return;
      }
      if (Date.now() - unregisteredSinceMs >= REBUILD_AFTER_MS) {
        if (sessionRef.current) {
          if (Date.now() - unregisteredSinceMs >= REBUILD_AFTER_MS * 3) {
            // Unregistered with a live session for 3x as long as the
            // normal rebuild threshold — this is very likely a zombie
            // socket that will never deliver a BYE for this call (a
            // healthy-enough connection would have re-registered by now).
            // Guaranteed line recovery wins over protecting a call that's
            // probably already dead in practice: end it and rebuild.
            try {
              sessionRef.current?.terminate();
            } catch {
              /* already ended */
            }
            unregisteredSinceMs = null;
            setReconnectGeneration((g) => g + 1);
          } else {
            // A call is live and we're not yet at the extended threshold —
            // rebuilding the whole UA/WebSocket now would drop it. Keep
            // trying a plain register() on schedule instead;
            // `unregisteredSinceMs` is deliberately left set (not reset) so
            // this same check keeps escalating on later ticks.
            uaRef.current.register();
          }
        } else {
          unregisteredSinceMs = null;
          setReconnectGeneration((g) => g + 1);
        }
      } else {
        uaRef.current.register();
      }
    }, 15000);

    return () => {
      appStateSub.remove();
      clearInterval(watchdog);
      stopInCallAudio();
      ua.stop();
      uaRef.current = null;
      sessionRef.current = null;
      inCallManagerRef.current = null;
      if (idleTransitionTimerRef.current) {
        clearTimeout(idleTransitionTimerRef.current);
        idleTransitionTimerRef.current = null;
      }
      // Defensive: a torn-down UA (config change, reconnectGeneration bump,
      // or unmount) must not leave a stale "incoming"/"connecting"/"in-call"
      // reading behind — the consuming CallContext gates a lot of behavior
      // on callState, and a frozen non-idle value here (with no session
      // left to act on) could wedge it in a live-call state forever.
      setCallState('idle');
      setRemoteIdentity(null);
    };
  }, [config, reconnectGeneration]);

  const hangup = useCallback(() => {
    try {
      sessionRef.current?.terminate();
    } catch {
      /* already ended */
    }
  }, []);

  const answerIncoming = useCallback(() => {
    try {
      sessionRef.current?.answer({ mediaConstraints: { audio: true, video: false }, pcConfig: pcConfigRef.current });
    } catch {
      /* already answered */
    }
  }, []);

  const declineIncoming = useCallback(() => {
    try {
      sessionRef.current?.terminate();
    } catch {
      /* already ended */
    }
  }, []);

  const sendDtmf = useCallback((tone: string) => {
    try {
      sessionRef.current?.sendDTMF(tone);
    } catch {
      /* not in a DTMF-eligible state */
    }
  }, []);

  const toggleMute = useCallback(() => {
    const session = sessionRef.current;
    if (!session) return;
    if (session.isMuted().audio) {
      session.unmute({ audio: true });
      setMuted(false);
    } else {
      session.mute({ audio: true });
      setMuted(true);
    }
  }, []);

  const setSpeaker = useCallback((on: boolean) => {
    try {
      inCallManagerRef.current?.setSpeakerphoneOn(on);
    } catch {
      /* best-effort */
    }
  }, []);

  // Direct SIP dial (app-to-app), e.g. calling another ilubilu extension
  // without going through the PSTN REST place-call flow. Outgoing direct
  // sessions flow through the existing newRTCSession handler above as
  // direction === "outgoing" -> "connecting" state.
  const call = useCallback(
    (target: string) => {
      if (!config || !uaRef.current) return;
      // This only catches synchronous throws (e.g. a malformed target URI) —
      // `UA.call()` itself doesn't reject a promise. A real getUserMedia/mic
      // failure surfaces asynchronously through the newRTCSession session's
      // "failed" handler above, whose cause regex already sets mediaError.
      try {
        uaRef.current.call(`sip:${target}@${config.host}`, {
          mediaConstraints: { audio: true, video: false },
          pcConfig: pcConfigRef.current,
        });
      } catch {
        setMediaError('Microphone unavailable — check app permissions.');
      }
    },
    [config],
  );

  // Call right before placing an outbound REST call so the resulting agent-leg
  // INVITE to this same line is auto-answered instead of shown as inbound.
  const markOutgoingCallPlaced = useCallback(() => {
    expectingAgentLegQueueRef.current.push(Date.now());
  }, []);

  // Undo the above when the place-call attempt turns out to be an internal
  // (SIP-to-SIP) call rather than a PSTN one, so no agent-leg is ever armed
  // for it.
  const cancelExpectedAgentLeg = useCallback(() => {
    expectingAgentLegQueueRef.current.pop();
  }, []);

  if (!isSupported) {
    return INERT_ENGINE;
  }

  return {
    supported: true,
    registered,
    registrationError: registrationError ?? mediaError,
    callState,
    remoteIdentity,
    muted,
    call,
    markOutgoingCallPlaced,
    cancelExpectedAgentLeg,
    answerIncoming,
    declineIncoming,
    hangup,
    toggleMute,
    setSpeaker,
    sendDtmf,
  };
}
