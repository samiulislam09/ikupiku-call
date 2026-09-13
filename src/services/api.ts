/**
 * Thin fetch-based client for the ilubilu backend (xcall).
 *
 * - `setAuthToken` stashes the bearer token used by every subsequent request.
 * - `api<T>` is the shared request helper: JSON in/out, `Authorization` header
 *   when a token is set, and non-2xx responses are turned into `ApiError`.
 * - Typed helpers below wrap the specific endpoints this app talks to.
 */
import { appStorage } from '@/utils/storage';

// Trailing slashes stripped: paths below all start with "/", and a
// "https://host//api/..." double slash can 404 depending on the server.
const BASE_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000').replace(/\/+$/, '');

let authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

// Central 401 hook: registered once by AuthProvider so ANY request anywhere
// in the app that comes back 401 (not just the ones AuthProvider itself
// makes, e.g. getMe()/refreshMe()) triggers the same "you're signed out"
// cleanup, instead of every call site having to remember to check for it.
let onUnauthorized: (() => void) | null = null;

export function setOnUnauthorized(cb: (() => void) | null): void {
  onUnauthorized = cb;
}

// Paths whose OWN 401 is an expected "wrong password" outcome, not a signal
// that an existing session's token went stale — must not trigger the
// central sign-out hook (there's no session to sign out of yet).
const UNAUTHENTICATED_PATHS = ['/api/app/auth/login', '/api/app/auth/register'];

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function api<T>(
  path: string,
  init?: { method?: string; body?: unknown }
): Promise<T> {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
  };
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method: init?.method ?? 'GET',
    headers,
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
  });

  const text = await res.text();
  let parsed: unknown = undefined;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = undefined;
    }
  }

  if (!res.ok) {
    const message =
      (parsed && typeof parsed === 'object' && 'error' in parsed && typeof (parsed as any).error === 'string'
        ? (parsed as any).error
        : undefined) ?? 'Request failed';
    if (res.status === 401 && !UNAUTHENTICATED_PATHS.some((p) => path.startsWith(p))) {
      onUnauthorized?.();
    }
    throw new ApiError(message, res.status);
  }

  return parsed as T;
}

export interface AppUserProfile {
  id: string;
  phone: string;
  name: string | null;
  status: string;
  remainingSeconds: number;
  // False until the signup OTP is completed. Optional because older
  // backends omit it — treat absent as verified (legacy behavior).
  verified?: boolean;
}

/** Echoed by register (and login, for a still-unverified user) so the OTP
 * screen knows whether a code was just auto-sent. */
export interface OtpSendInfo {
  sent: boolean;
  expiresInMinutes?: number;
  devCode?: string;
}

export interface IceServer {
  urls: string[] | string;
  username?: string;
  credential?: string;
}

export interface SoftphoneCreds {
  ready: boolean;
  sipExtension?: string;
  sipPassword?: string;
  host?: string;
  wsUrl?: string;
  iceServers?: IceServer[];
}

export type PlaceCallResult =
  | { type: 'internal'; extension: string; name: string | null }
  | { type: 'pstn'; call: { call_id: string; status: string }; remainingSeconds: number };

export async function registerUser(
  phone: string,
  password: string,
  name?: string
): Promise<{ token: string; user: AppUserProfile; otp?: OtpSendInfo }> {
  return api('/api/app/auth/register', {
    method: 'POST',
    body: { phone, password, name },
  });
}

export async function loginUser(
  phone: string,
  password: string
): Promise<{ token: string; user: AppUserProfile; otp?: OtpSendInfo }> {
  return api('/api/app/auth/login', {
    method: 'POST',
    body: { phone, password },
  });
}

export async function getMe(): Promise<AppUserProfile & { extensionReady: boolean }> {
  return api('/api/app/me');
}

/** Re-sends the signup OTP for the signed-in (but unverified) user.
 * Rate-limited server-side (60s cooldown / 10 per hour) — a 429 arrives as
 * an ApiError with a user-facing message. Never returns 401 for
 * wrong-state; a genuine 401 means a stale token and the central sign-out
 * hook is the right outcome. */
export async function startOtp(): Promise<{
  ok: boolean;
  expiresInMinutes?: number;
  cooldownSeconds?: number;
  devCode?: string;
}> {
  return api('/api/app/auth/otp/start', { method: 'POST', body: {} });
}

/** Submits the signup OTP. Wrong/expired codes are 400 ApiErrors with a
 * user-facing message (never 401). Success returns the updated user with
 * verified: true. */
export async function verifyOtp(code: string): Promise<{
  ok: boolean;
  verified: boolean;
  user: AppUserProfile & { extensionReady: boolean };
}> {
  return api('/api/app/auth/otp/verify', { method: 'POST', body: { code } });
}

export async function getSoftphone(deviceId: string): Promise<SoftphoneCreds> {
  return api(`/api/app/softphone?deviceId=${encodeURIComponent(deviceId)}`);
}

export async function getSoftphoneStatus(deviceId: string): Promise<{ active: boolean }> {
  return api(`/api/app/softphone/status?deviceId=${encodeURIComponent(deviceId)}`);
}

export async function placeCall(to: string): Promise<PlaceCallResult> {
  return api('/api/app/calls/place', {
    method: 'POST',
    body: { to },
  });
}

export interface ServerCallLogEntry {
  id: string;
  direction: 'outgoing' | 'incoming';
  kind: string;
  peerNumber: string;
  status: string;
  durationSeconds: number;
  secondsCharged: number;
  selxCallId: string | null;
  startedAt: string;
}

export interface GetServerCallsResponse {
  calls: ServerCallLogEntry[];
  total: number;
  page: number;
  pageSize: number;
}

/** Server-side call history (both PSTN and self-reported INTERNAL calls),
 * paginated 50/page — mirrors GET /api/app/calls. */
export async function getServerCalls(page: number = 1): Promise<GetServerCallsResponse> {
  return api(`/api/app/calls?page=${encodeURIComponent(String(page))}`);
}

export interface ReportCallBody {
  // 'INTERNAL' for the app's own internal outgoing SIP dial; 'INBOUND' for a
  // genuine or push-woken inbound call (either direction "incoming"). Both
  // are unmetered — the server forces secondsCharged to 0 for both kinds —
  // this only distinguishes the two for honest call-history labeling.
  kind: 'INTERNAL' | 'INBOUND';
  direction: 'outgoing' | 'incoming';
  peerNumber: string;
  durationSeconds: number;
  status: 'completed' | 'missed';
}

/** Self-reports the outcome of a real internal-SIP-layer call (an outgoing
 * internal dial, or a genuine/push-woken inbound call) — the app is the only
 * party that knows these happened, unlike PSTN calls which the server
 * already tracks via the trunk/webhook. Callers should fire this without
 * awaiting and swallow any rejection: a failed report just means that one
 * call is missing from server-side history, not something worth
 * surfacing to the user. */
export async function reportCall(body: ReportCallBody): Promise<void> {
  await api('/api/app/calls/report', {
    method: 'POST',
    body,
  });
}

/** Resolves which of the given phone numbers belong to other active
 * ilubilu app users (server normalizes each to BD E.164 and matches
 * against provisioned accounts). Callers should chunk `phones` to at most
 * 200 entries per call — the server rejects longer arrays. */
export async function resolveAppContacts(phones: string[]): Promise<string[]> {
  if (phones.length === 0) return [];
  const { appUserPhones } = await api<{ appUserPhones: string[] }>('/api/app/contacts/resolve', {
    method: 'POST',
    body: { phones },
  });
  return appUserPhones;
}

/** Registers this device's FCM token for push-woken incoming-call
 * notifications. Throws `ApiError` with status 409 when the account's
 * calling line isn't provisioned yet (`appUser.ext` not set) — callers
 * should swallow that and rely on retrying once `extensionReady` flips
 * true (e.g. after the next `refreshMe()`). */
export async function registerPushToken(token: string): Promise<void> {
  await api('/api/app/push-token', {
    method: 'POST',
    body: { token, platform: 'android' },
  });
}

/** Unregisters this device's FCM token — call on logout so a signed-out
 * phone stops ringing for calls that aren't its problem anymore. `api()`
 * already forwards `body` regardless of HTTP method (it's just handed to
 * `fetch()`'s `body` option unconditionally), so a DELETE with a JSON body
 * works with no changes to the shared client. */
export async function unregisterPushToken(token: string): Promise<void> {
  await api('/api/app/push-token', {
    method: 'DELETE',
    body: { token },
  });
}

const DEVICE_ID_STORAGE_KEY = 'ilubilu_device_id';

/** Random id generated once per install and persisted under `ilubilu_device_id`. */
export function getDeviceId(): string {
  const existing = appStorage.getItem(DEVICE_ID_STORAGE_KEY);
  if (existing) return existing;

  const generated = `dev_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  appStorage.setItem(DEVICE_ID_STORAGE_KEY, generated);
  return generated;
}
