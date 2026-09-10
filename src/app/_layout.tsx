import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { KeypadModal } from '@/components/keypad/keypad-modal';
import { KeypadProvider } from '@/context/keypad-context';
import { ThemeProviderCustom, useThemeContext } from '@/context/theme-context';

SplashScreen.preventAutoHideAsync();

function RootLayoutContent() {
  const { colorScheme } = useThemeContext();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <KeypadProvider>
        <AnimatedSplashOverlay />
        <AppTabs />
        <KeypadModal />
      </KeypadProvider>
    </ThemeProvider>
  );
}

export default function TabLayout() {
  return (
    <ThemeProviderCustom>
      <RootLayoutContent />
    </ThemeProviderCustom>
  );
}
