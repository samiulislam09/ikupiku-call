import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react';

export type CallStatus = 'idle' | 'incoming' | 'outgoing' | 'connected' | 'ended';

export interface CallerInfo {
  name: string;
  number: string;
  label?: string;
  avatarColor?: string;
}

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
}

const CallContext = createContext<CallContextType | null>(null);

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

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoConnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        setDuration((prev) => prev + 1);
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
  }, [clearTimers]);

  // Start outgoing call
  const startCall = useCallback(
    (newCaller?: Partial<CallerInfo>) => {
      resetCallState();
      setCaller({
        ...DEFAULT_CALLER,
        ...(newCaller || {}),
      });
      setCallStatus('outgoing');

      // Auto connect after 2 seconds for smooth realistic preview
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
    clearTimers();
    setCallStatus('connected');
    setDuration(0);
  }, [clearTimers]);

  // Decline incoming call
  const declineCall = useCallback(() => {
    clearTimers();
    setCallStatus('ended');
    setTimeout(() => {
      setCallStatus('idle');
      resetCallState();
    }, 600);
  }, [clearTimers, resetCallState]);

  // End active or outgoing call
  const endCall = useCallback(() => {
    clearTimers();
    setCallStatus('ended');
    setTimeout(() => {
      setCallStatus('idle');
      resetCallState();
    }, 700);
  }, [clearTimers, resetCallState]);

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
