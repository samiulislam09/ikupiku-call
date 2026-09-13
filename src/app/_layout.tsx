import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { LoginScreen } from '@/components/auth/login-screen';
import { OtpScreen } from '@/components/auth/otp-screen';
import { CallingModal } from '@/components/call/calling-modal';
import { KeypadModal } from '@/components/keypad/keypad-modal';
import { AuthProvider, useAuth } from '@/context/auth-context';
import { CallProvider } from '@/context/call-context';
import { KeypadProvider } from '@/context/keypad-context';
import { ThemeProviderCustom, useThemeContext } from '@/context/theme-context';

import { UserProfileProvider } from '@/context/user-profile-context';
import { hydrateStorage } from '@/utils/storage';

SplashScreen.preventAutoHideAsync();

function SignedInApp() {
  return (
    <UserProfileProvider>
      <CallProvider>
        <KeypadProvider>
          <AppTabs />
          <KeypadModal />
          <CallingModal />
        </KeypadProvider>
      </CallProvider>
    </UserProfileProvider>
  );
}

function AuthGate() {
  const { status } = useAuth();

  // While auth is resolving, keep rendering nothing — the native splash
  // screen (frozen by `preventAutoHideAsync`) still covers the screen.
  if (status === 'loading') return null;

  // Once auth is resolved (signed in or out) mount the animated splash
  // overlay so it hides the native splash and transitions out, regardless
  // of which tree renders underneath it.
  return (
    <>
      <AnimatedSplashOverlay />
      {/* pendingVerification deliberately does NOT mount SignedInApp: no
          softphone polling, push registration, or call UI can run until
          the phone is verified. */}
      {status === 'signedIn' ? (
        <SignedInApp />
      ) : status === 'pendingVerification' ? (
        <OtpScreen />
      ) : (
        <LoginScreen />
      )}
    </>
  );
}

function RootLayoutContent() {
  const { colorScheme } = useThemeContext();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <AuthGate />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default function TabLayout() {
  const [storageReady, setStorageReady] = useState(false);

  useEffect(() => {
    hydrateStorage().finally(() => setStorageReady(true));
  }, []);

  if (!storageReady) return null;

  return (
    <ThemeProviderCustom>
      <RootLayoutContent />
    </ThemeProviderCustom>
  );
}
