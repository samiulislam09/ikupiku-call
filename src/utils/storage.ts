/**
 * Safe local storage utility that works across Web (localStorage) and SSR/Native.
 */

const memoryStore: Record<string, string> = {};

export const appStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch {
      // safe fallback
    }
    return memoryStore[key] ?? null;
  },

  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch {
      // safe fallback
    }
    memoryStore[key] = value;
  },

  removeItem: (key: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch {
      // safe fallback
    }
    delete memoryStore[key];
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

