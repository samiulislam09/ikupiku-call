import * as Linking from 'expo-linking';
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react';

import {
    ACTION_ANSWER,
    ACTION_DECLINE,
    DEFAULT_ACTION_IDENTIFIER,
    addNotificationResponseListener,
    dismissIncomingCallNotification,
    getLastNotificationResponse,
    IncomingCallPayload,
    isNotificationsSupported,
    scheduleIncomingCallNotification,
    setupIncomingCallNotifications,
} from '@/services/incoming-call-service';
import { appStorage } from '@/utils/storage';

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
  const durationRef = useRef(0);
  const initialDirectionRef = useRef<'incoming' | 'outgoing'>('outgoing');

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
  }, []);

  // Duration ticking when connected and not on hold
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
  }, [clearTimers]);

  // Start outgoing call
  const startCall = useCallback(
    (newCaller?: Partial<CallerInfo>) => {
      resetCallState();
      initialDirectionRef.current = 'outgoing';
      setCaller({
        ...DEFAULT_CALLER,
        ...(newCaller || {}),
      });
      setCallStatus('outgoing');

      // Auto connect after 2.4 seconds for smooth realistic preview
      autoConnectTimerRef.current = setTimeout(() => {
        setCallStatus('connected');
      }, 2400);
    },
    [resetCallState]
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

  // Accept incoming call
  const acceptCall = useCallback(() => {
    dismissIncomingCallNotification();
    clearTimers();
    setCallStatus('connected');
    setDuration(0);
    durationRef.current = 0;
  }, [clearTimers]);

  // Decline incoming call
  const declineCall = useCallback(() => {
    dismissIncomingCallNotification();
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
    setTimeout(() => {
      setCallStatus('idle');
      resetCallState();
    }, 600);
  }, [clearTimers, caller, addCallRecordInternal, resetCallState]);

  // End active or outgoing call
  const endCall = useCallback(() => {
    dismissIncomingCallNotification();
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
    setTimeout(() => {
      setCallStatus('idle');
      resetCallState();
    }, 700);
  }, [clearTimers, callStatus, caller, addCallRecordInternal, resetCallState]);

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

  const toggleMute = useCallback(() => setIsMuted((v) => !v), []);
  const toggleSpeaker = useCallback(() => setIsSpeakerOn((v) => !v), []);
  const toggleHold = useCallback(() => setIsOnHold((v) => !v), []);
  const toggleVideo = useCallback(() => setIsVideoOn((v) => !v), []);
  const toggleKeypad = useCallback(
    () => setIsInCallKeypadOpen((v) => !v),
    []
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
