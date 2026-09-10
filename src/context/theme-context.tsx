import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
} from 'react';
import {
    Appearance,
    Platform,
    useColorScheme as useRNColorScheme,
} from 'react-native';

import { Colors, Theme } from '@/constants/theme';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  themeMode: ThemeMode;
  colorScheme: 'light' | 'dark';
  isDark: boolean;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  theme: Theme;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProviderCustom({ children }: { children: React.ReactNode }) {
  const systemScheme = useRNColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');

  const colorScheme: 'light' | 'dark' =
    themeMode === 'system'
      ? systemScheme === 'dark'
        ? 'dark'
        : 'light'
      : themeMode;

  const isDark = colorScheme === 'dark';

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      if (Platform.OS !== 'web') {
        Appearance.setColorScheme(mode === 'system' ? 'unspecified' : mode);
      }
    } catch {
      // safe fallback
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeModeState((prev) => {
      const current =
        prev === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : prev;
      const next = current === 'dark' ? 'light' : 'dark';
      try {
        if (Platform.OS !== 'web') {
          Appearance.setColorScheme(next);
        }
      } catch {
        // safe fallback
      }
      return next;
    });
  }, [systemScheme]);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      if (isDark) {
        document.documentElement.classList.add('dark-theme');
        document.documentElement.classList.remove('light-theme');
      } else {
        document.documentElement.classList.add('light-theme');
        document.documentElement.classList.remove('dark-theme');
      }
    }
  }, [isDark]);

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        colorScheme,
        isDark,
        setThemeMode,
        toggleTheme,
        theme: Colors[colorScheme],
      }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  const context = useContext(ThemeContext);
  if (!context) {
    const scheme = Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
    return {
      themeMode: 'system' as ThemeMode,
      colorScheme: scheme,
      isDark: scheme === 'dark',
      setThemeMode: () => {},
      toggleTheme: () => {},
      theme: Colors[scheme],
    };
  }
  return context;
}

