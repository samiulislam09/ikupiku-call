import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react';
import { AppState, Platform } from 'react-native';

import {
    ApiError,
    AppUserProfile,
    getMe,
    loginUser,
    registerUser,
    setAuthToken,
    setOnUnauthorized,
    startOtp,
    verifyOtp as apiVerifyOtp,
} from '@/services/api';
import { clearCachedCreds } from '@/services/creds-cache';
import { unregisterLastToken } from '@/services/push-registration';
import { appStorage } from '@/utils/storage';

// Per-user data cleared on logout so it doesn't leak into whoever signs in
// next on this device — deliberately excludes 'ilubilu_device_id' (tied to
// the physical install, not the account) and theme/settings keys (device
// preferences, not account data).
const PER_USER_STORAGE_KEYS = [
  'ilubilu_call_logs',
  'ilubilu_contacts',
  'ilubilu_user_profile',
  // The cached "which contacts are other app users" Set (see
  // contacts.tsx) — resolved against THIS account's phone-number contact
  // list, so it must not leak into whoever signs in next on a shared
  // device (a stale match would show a false "FREE" badge, or worse, hide
  // one for a contact that IS an app user for the new account).
  'ilubilu_app_contacts',
];

const TOKEN_STORAGE_KEY = 'ilubilu_auth_token';

type SecureStoreModule = {
  getItemAsync: (key: string) => Promise<string | null>;
  setItemAsync: (key: string, value: string) => Promise<void>;
  deleteItemAsync: (key: string) => Promise<void>;
};

let secureStoreModule: SecureStoreModule | null | undefined;

/** Lazily requires expo-secure-store. Never called on web (native-only module). */
function getSecureStore(): SecureStoreModule | null {
  if (Platform.OS === 'web') return null;
  if (secureStoreModule !== undefined) return secureStoreModule;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    secureStoreModule = require('expo-secure-store');
  } catch {
    secureStoreModule = null;
  }
  return secureStoreModule ?? null;
}

async function loadToken(): Promise<string | null> {
  const secureStore = getSecureStore();
  if (secureStore) {
    try {
      return await secureStore.getItemAsync(TOKEN_STORAGE_KEY);
    } catch {
      // fall through to appStorage
    }
  }
  return appStorage.getItem(TOKEN_STORAGE_KEY);
}

async function persistToken(token: string | null): Promise<void> {
  const secureStore = getSecureStore();
  if (secureStore) {
    try {
      if (token) {
        await secureStore.setItemAsync(TOKEN_STORAGE_KEY, token);
      } else {
        await secureStore.deleteItemAsync(TOKEN_STORAGE_KEY);
      }
      return;
    } catch {
      // fall through to appStorage
    }
  }
  if (token) {
    appStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    appStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

export type AuthStatus = 'loading' | 'signedOut' | 'pendingVerification' | 'signedIn';

export type AuthUser = AppUserProfile & { extensionReady?: boolean };

/** `user.verified` is the single source of truth for the pending state.
 * Absent (older backend) or true → signedIn, so unknown/legacy shapes keep
 * today's behavior. */
function statusForUser(user: AppUserProfile): AuthStatus {
  return user.verified === false ? 'pendingVerification' : 'signedIn';
}

interface AuthContextType {
  status: AuthStatus;
  user: AuthUser | null;
  login: (phone: string, password: string) => Promise<void>;
  register: (phone: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
  /** Submits the signup OTP; on success the gate flips to the full app. */
  verifyOtp: (code: string) => Promise<void>;
  /** Re-sends the OTP; resolves with the server's cooldown hint. */
  resendOtp: () => Promise<{ cooldownSeconds?: number }>;
  /** Epoch ms of the last known OTP send (register/login auto-send or an
   * explicit resend); null when unknown (e.g. cold start restored a
   * pending session), meaning the OTP screen may offer resend at once. */
  otpSentAt: number | null;
  /** The OTP itself, present ONLY when the backend runs with
   * SMS_DEV_MODE=true (no real SMS goes out there). Shown on the OTP
   * screen so the flow stays testable without a working SMS gateway;
   * production backends never send this field. */
  otpDevCode: string | null;
  /** Server-reported code validity in minutes (null until a send reports
   * it) — the OTP screen's copy uses this instead of guessing. */
  otpExpiresInMinutes: number | null;
  // Stable ref (never reassigned, only `.current` mutated) flipped
  // SYNCHRONOUSLY to true at the very top of logout() — before any await —
  // and back to false on the next successful login/register. Exists to
  // close a race `cancelled` flags alone can't: call-context's credential
  // loop's own `cancelled` is only set inside that effect's cleanup, which
  // React only runs on a LATER render after `setStatus('signedOut')` is
  // called, not synchronously when logout() itself runs. An in-flight
  // getSoftphone() fetch can resolve and continue executing in that gap,
  // reading `cancelled === false` still, and re-save the exact credentials
  // logout() just cleared. Reading this ref (mutated the instant logout()
  // starts, independent of React's render/commit timing) closes that gap.
  isSigningOut: React.MutableRefObject<boolean>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [otpSentAt, setOtpSentAt] = useState<number | null>(null);
  const [otpDevCode, setOtpDevCode] = useState<string | null>(null);
  const [otpExpiresInMinutes, setOtpExpiresInMinutes] = useState<number | null>(null);
  // See AuthContextType.isSigningOut above for why this exists.
  const isSigningOutRef = useRef(false);

  useEffect(() => {
    (async () => {
      const token = await loadToken();
      if (!token) {
        setStatus('signedOut');
        return;
      }

      setAuthToken(token);
      try {
        const me = await getMe();
        setUser(me);
        // An unverified user with a stored token lands back on the OTP
        // screen, not in the app. No otpSentAt here — no code was just
        // sent, so the screen offers "Send code" immediately.
        setStatus(statusForUser(me));
      } catch (err) {
        // 401 = the token is actually invalid (real logout): clear it from
        // storage too, so a future cold start doesn't try it again. Any
        // other error (network failure, server down, etc.) is treated as
        // "probably offline" — the stored token is kept so the next launch
        // can silently resume the session. Either way we clear the
        // in-memory token unconditionally so `signedOut` truly means no
        // bearer header is attached — otherwise the login screen's own
        // requests would go out carrying a stale Authorization header.
        if (err instanceof ApiError && err.status === 401) {
          await persistToken(null);
        }
        setAuthToken(null);
        setStatus('signedOut');
      }
    })();
  }, []);

  const login = useCallback(async (phone: string, password: string) => {
    const { token, user: loggedInUser, otp } = await loginUser(phone, password);
    // Clear on the next successful login: a prior logout's ref would
    // otherwise stay stuck true forever and permanently block this new
    // session's credential-loop saves/replacements.
    isSigningOutRef.current = false;
    setAuthToken(token);
    await persistToken(token);
    setUser(loggedInUser);
    const next = statusForUser(loggedInUser);
    // The backend auto-sends an OTP when an unverified user logs in — seed
    // the resend cooldown so the screen doesn't invite an instant re-send.
    if (next === 'pendingVerification' && otp?.sent) setOtpSentAt(Date.now());
    setOtpDevCode(otp?.devCode ?? null);
    setOtpExpiresInMinutes(otp?.expiresInMinutes ?? null);
    setStatus(next);
  }, []);

  const register = useCallback(async (phone: string, password: string, name?: string) => {
    const { token, user: newUser, otp } = await registerUser(phone, password, name);
    // See login()'s comment above — same reasoning.
    isSigningOutRef.current = false;
    setAuthToken(token);
    await persistToken(token);
    setUser(newUser);
    const next = statusForUser(newUser);
    if (next === 'pendingVerification' && otp?.sent) setOtpSentAt(Date.now());
    setOtpDevCode(otp?.devCode ?? null);
    setOtpExpiresInMinutes(otp?.expiresInMinutes ?? null);
    setStatus(next);
  }, []);

  const verifyOtp = useCallback(async (code: string) => {
    const result = await apiVerifyOtp(code);
    // A verify resolving after logout() must not resurrect the session —
    // same race the credential loop guards against with this ref.
    if (isSigningOutRef.current) return;
    setUser(result.user);
    setStatus(statusForUser(result.user));
  }, []);

  const resendOtp = useCallback(async () => {
    const result = await startOtp();
    if (!isSigningOutRef.current) {
      setOtpSentAt(Date.now());
      setOtpDevCode(result.devCode ?? null);
      setOtpExpiresInMinutes(result.expiresInMinutes ?? null);
    }
    return { cooldownSeconds: result.cooldownSeconds };
  }, []);

  const logout = useCallback(async () => {
    // Set SYNCHRONOUSLY, before any await, so a call-context credential-loop
    // fetch that's already in flight sees this the instant it resolves —
    // see AuthContextType.isSigningOut's doc comment for the race this
    // closes.
    isSigningOutRef.current = true;
    // Best-effort: unregister this device's FCM token BEFORE the auth token
    // is cleared below — the DELETE needs the Authorization header on its
    // outgoing request, so ordering here is load-bearing (see
    // services/push-registration.ts's doc comment).
    await unregisterLastToken();
    setAuthToken(null);
    await persistToken(null);
    // Wipe per-user data so it doesn't leak into whoever signs in next on
    // this shared/reused device — device-level data (the install's
    // ilubilu_device_id, theme/settings) is deliberately left alone.
    for (const key of PER_USER_STORAGE_KEYS) {
      appStorage.removeItem(key);
    }
    // Also wipe the cached softphone creds (SecureStore, not appStorage) so
    // a stale line's credentials can never be fast-path-seeded into a
    // future session on this device — the userId check in call-context's
    // credential loop would already refuse to seed a DIFFERENT next user,
    // but this same user signing back in later should re-fetch fresh creds
    // rather than resume a possibly-revoked cached registration.
    await clearCachedCreds();
    setUser(null);
    setOtpSentAt(null);
    setOtpDevCode(null);
    setStatus('signedOut');
  }, []);

  // Central 401 hook (see services/api.ts's setOnUnauthorized): fires for
  // ANY request anywhere in the app that comes back 401 — not just the ones
  // this file itself makes (getMe()/refreshMe()) — so a token that goes
  // stale mid-session (revoked, expired, account removed) while the user is
  // deep in some other screen still bounces them out cleanly. Routed
  // through the same `logout()` used for an explicit sign-out so both paths
  // share one definition of "what signing out means" (token + per-user data
  // cleanup) rather than drifting apart over time.
  useEffect(() => {
    setOnUnauthorized(() => {
      logout();
    });
    return () => setOnUnauthorized(null);
  }, [logout]);

  const refreshMe = useCallback(async () => {
    try {
      const me = await getMe();
      if (isSigningOutRef.current) return;
      setUser(me);
      setStatus(statusForUser(me));
    } catch {
      // Non-401 errors (e.g. a transient network blip while already signed
      // in) are deliberately swallowed here — we keep the existing signed-in
      // state rather than bouncing the user to the login screen. A 401 here
      // is also already handled by the central onUnauthorized hook above
      // (getMe() goes through api<T>() like every other request), so this
      // catch no longer needs its own duplicate sign-out branch for it.
    }
  }, []);

  // Provisioning me-poll: after verification the backend creates the
  // user's calling account asynchronously — while signed in without a
  // ready line, refresh `me` every 10s (up to 5 minutes per activation) so
  // `extensionReady` flipping true is noticed promptly. The flip
  // propagates automatically: call-context's credential loop and push
  // registration both depend on auth.user?.extensionReady. A foreground
  // transition after the window expired re-arms it (same pattern as
  // call-context's credentialRetryTick).
  const [mePollTick, setMePollTick] = useState(0);
  const mePollExhaustedRef = useRef(false);
  useEffect(() => {
    if (status !== 'signedIn' || !user || user.extensionReady) {
      mePollExhaustedRef.current = false;
      return;
    }

    let cancelled = false;
    const startedAt = Date.now();
    const interval = setInterval(() => {
      if (cancelled || isSigningOutRef.current) return;
      if (Date.now() - startedAt > 5 * 60_000) {
        mePollExhaustedRef.current = true;
        clearInterval(interval);
        return;
      }
      void refreshMe();
    }, 10_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // Primitive deps only — refreshMe gives `user` a fresh identity every
    // tick; depending on the object would restart the effect each time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, user?.id, user?.extensionReady, mePollTick]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && mePollExhaustedRef.current) {
        mePollExhaustedRef.current = false;
        setMePollTick((t) => t + 1);
      }
    });
    return () => sub.remove();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        status,
        user,
        login,
        register,
        logout,
        refreshMe,
        verifyOtp,
        resendOtp,
        otpSentAt,
        otpDevCode,
        otpExpiresInMinutes,
        isSigningOut: isSigningOutRef,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
