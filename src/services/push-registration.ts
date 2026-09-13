/**
 * Shared last-registered-FCM-token state for the push-token lifecycle.
 *
 * Lives in its own module (rather than inside call-context or auth-context)
 * because BOTH need it: call-context's register effect writes it (to avoid
 * re-POSTing an unchanged token on every re-render/extensionReady flip),
 * and auth-context's logout() reads it (to know which token to DELETE) —
 * and logout() must fire that DELETE BEFORE clearing the auth token
 * (setAuthToken(null)/persistToken(null)), since the request needs the
 * Authorization header. Putting the ref in a tiny shared module avoids
 * wiring a callback/prop between two otherwise-independent contexts just to
 * pass one string.
 */
import { ApiError, registerPushToken, unregisterPushToken } from './api';

let lastRegisteredToken: string | null = null;

/** Registers `token` with the backend, remembering it so a later call with
 * the same (unchanged) token is a no-op — avoids duplicate POSTs when the
 * register effect re-runs (e.g. extensionReady flipping, a routine
 * refreshMe()) without the token itself having changed. A 409 (calling
 * line not provisioned yet) is swallowed silently: the caller's effect
 * re-runs and retries once `extensionReady` flips true. Any other error is
 * also swallowed — this is a best-effort background registration, not
 * something that should surface to the UI. */
export async function registerToken(token: string): Promise<void> {
  if (token === lastRegisteredToken) return;
  try {
    await registerPushToken(token);
    lastRegisteredToken = token;
  } catch (err) {
    if (err instanceof ApiError && err.status === 409) return;
    // Best-effort: swallow other failures (network blip, etc.) too — the
    // next register-effect run or token refresh will retry.
  }
}

/** Best-effort unregister of the last-registered token. Must be called
 * from auth-context's logout() BEFORE the auth token is cleared (see this
 * module's doc comment above for why). Always clears the remembered token
 * afterwards, success or not, so a future login (even one that ends up
 * reusing the same FCM token) doesn't skip re-registering because of stale
 * in-memory state from the previous session. */
export async function unregisterLastToken(): Promise<void> {
  const token = lastRegisteredToken;
  lastRegisteredToken = null;
  if (!token) return;
  try {
    await unregisterPushToken(token);
  } catch {
    // Best-effort: a failed DELETE just leaves a stale token registered
    // server-side, which is a push to a device that ignores it.
  }
}
