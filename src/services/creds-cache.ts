/**
 * SecureStore cache of softphone credentials, so a push-woken app can seed
 * the SIP engine's config and start registering immediately instead of
 * waiting on the getSoftphone() round trip (and its up-to-10s poll retry) to
 * complete first.
 *
 * Deliberately does NOT cache `iceServers`: TURN relay credentials are
 * short-lived (see xcall's GET /api/me/softphone), so a cache-based
 * registration runs STUN-only until the fresh fetch lands. Because
 * sipConfigsEqual (call-context.tsx) ignores iceServers once the identity
 * fields match, that fresh fetch alone would never get applied if nothing
 * else changed — call-context's credential loop special-cases this: it
 * forces one config replacement (bypassing sipConfigsEqual) the first time
 * a fresh result carries a non-empty iceServers array while the current
 * (cache-seeded) config has none, so useSipEngine rebuilds exactly once to
 * pick up TURN relay support.
 *
 * Web has no SecureStore — all three functions no-op/return null there,
 * mirroring auth-context's `getSecureStore()` lazy-require shape.
 */
import { Platform } from 'react-native';

const CREDS_STORAGE_KEY = 'ilubilu_softphone_creds';

export interface CachedCreds {
  sipExtension: string;
  sipPassword: string;
  host: string;
  wsUrl: string;
  userId: string;
}

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

/** Fire-and-forget best-effort write; a failed cache write must never
 * surface as an error to the credential loop (the fresh fetch remains the
 * source of truth regardless). */
export async function saveCachedCreds(creds: CachedCreds): Promise<void> {
  const secureStore = getSecureStore();
  if (!secureStore) return;
  try {
    await secureStore.setItemAsync(CREDS_STORAGE_KEY, JSON.stringify(creds));
  } catch {
    // best-effort only
  }
}

export async function loadCachedCreds(): Promise<CachedCreds | null> {
  const secureStore = getSecureStore();
  if (!secureStore) return null;
  try {
    const raw = await secureStore.getItemAsync(CREDS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed.sipExtension === 'string' &&
      typeof parsed.sipPassword === 'string' &&
      typeof parsed.host === 'string' &&
      typeof parsed.wsUrl === 'string' &&
      typeof parsed.userId === 'string'
    ) {
      return parsed as CachedCreds;
    }
    return null;
  } catch {
    return null;
  }
}

export async function clearCachedCreds(): Promise<void> {
  const secureStore = getSecureStore();
  if (!secureStore) return;
  try {
    await secureStore.deleteItemAsync(CREDS_STORAGE_KEY);
  } catch {
    // best-effort only
  }
}
