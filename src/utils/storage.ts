/**
 * Safe local storage utility that works across Web (localStorage) and Native (AsyncStorage).
 *
 * - Web: reads/writes go straight to `window.localStorage`, exactly as before.
 * - Native: reads/writes are served synchronously from an in-memory cache that is
 *   (a) hydrated once at startup from AsyncStorage via `hydrateStorage()`, and
 *   (b) write-through persisted to AsyncStorage on every `setItem`/`removeItem`
 *       (fire-and-forget — failures are swallowed so the sync API never throws).
 *
 * AsyncStorage is lazy-required so web (and SSR) never loads the native module.
 */
import { Platform } from 'react-native';

type AsyncStorageModule = {
  getAllKeys: () => Promise<readonly string[]>;
  multiGet: (keys: readonly string[]) => Promise<readonly [string, string | null][]>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

const memoryStore: Record<string, string> = {};

const isWeb = Platform.OS === 'web';

let asyncStorageModule: AsyncStorageModule | null | undefined;

/** Lazily requires @react-native-async-storage/async-storage. Never called on web. */
function getAsyncStorage(): AsyncStorageModule | null {
  if (isWeb) return null;
  if (asyncStorageModule !== undefined) return asyncStorageModule;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    asyncStorageModule = require('@react-native-async-storage/async-storage').default;
  } catch {
    asyncStorageModule = null;
  }
  return asyncStorageModule ?? null;
}

function hasLocalStorage(): boolean {
  try {
    return isWeb && typeof window !== 'undefined' && !!window.localStorage;
  } catch {
    return false;
  }
}

export const appStorage = {
  getItem: (key: string): string | null => {
    if (hasLocalStorage()) {
      try {
        return window.localStorage.getItem(key);
      } catch {
        // safe fallback
      }
    }
    return memoryStore[key] ?? null;
  },

  setItem: (key: string, value: string): void => {
    if (hasLocalStorage()) {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        // safe fallback
      }
    }
    memoryStore[key] = value;

    if (!isWeb) {
      getAsyncStorage()
        ?.setItem(key, value)
        .catch(() => {});
    }
  },

  removeItem: (key: string): void => {
    if (hasLocalStorage()) {
      try {
        window.localStorage.removeItem(key);
      } catch {
        // safe fallback
      }
    }
    delete memoryStore[key];

    if (!isWeb) {
      getAsyncStorage()
        ?.removeItem(key)
        .catch(() => {});
    }
  },

  getJSON: <T>(key: string, defaultValue: T): T => {
    const raw = appStorage.getItem(key);
    if (!raw) return defaultValue;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return defaultValue;
    }
  },

  setJSON: <T>(key: string, value: T): void => {
    try {
      appStorage.setItem(key, JSON.stringify(value));
    } catch {
      // safe fallback
    }
  },
};

let hydrationPromise: Promise<void> | null = null;

/**
 * Loads every persisted key from AsyncStorage into the in-memory cache so the
 * synchronous `appStorage` API returns durable data on native. No-op on web
 * (localStorage is already the source of truth there). Safe to call multiple
 * times — the underlying read only ever runs once.
 */
export function hydrateStorage(): Promise<void> {
  if (isWeb) return Promise.resolve();
  if (hydrationPromise) return hydrationPromise;

  hydrationPromise = (async () => {
    const AsyncStorage = getAsyncStorage();
    if (!AsyncStorage) return;
    try {
      const keys = await AsyncStorage.getAllKeys();
      if (!keys.length) return;
      const pairs = await AsyncStorage.multiGet(keys);
      for (const [key, value] of pairs) {
        if (value != null) memoryStore[key] = value;
      }
    } catch {
      // safe fallback: keep whatever is already in memoryStore
    }
  })();

  return hydrationPromise;
}
