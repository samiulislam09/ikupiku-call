import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppIcon } from '@/components/ui/app-icon';
import { SpringPressable } from '@/components/ui/spring-pressable';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useCall } from '@/context/call-context';
import { useTheme } from '@/hooks/use-theme';

const READY_FLASH_MS = 4000;

/**
 * Home-tab banner narrating the calling line's lifecycle: account being
 * set up on the server → SIP connecting → error with a Retry → a brief
 * "ready" flash when the line first comes up. Renders nothing once the
 * line is established (after the flash).
 */
export function LineStatusBanner() {
  const theme = useTheme();
  const { user } = useAuth();
  const { lineReady, lineError, retryLine } = useCall();

  // Flash "ready" once when lineReady flips false→true, then hide.
  const prevReadyRef = useRef(lineReady);
  const [showReadyFlash, setShowReadyFlash] = useState(false);
  useEffect(() => {
    if (lineReady && !prevReadyRef.current) {
      setShowReadyFlash(true);
      const timer = setTimeout(() => setShowReadyFlash(false), READY_FLASH_MS);
      prevReadyRef.current = lineReady;
      return () => clearTimeout(timer);
    }
    prevReadyRef.current = lineReady;
  }, [lineReady]);

  if (!user) return null;

  if (!user.extensionReady) {
    return (
      <View style={[styles.banner, { backgroundColor: theme.primary + '14' }]}>
        <ActivityIndicator size="small" color={theme.primary} />
        <ThemedText type="small" themeColor="textSecondary" style={styles.text}>
          Setting up your calling line…
        </ThemedText>
      </View>
    );
  }

  if (lineError) {
    return (
      <View style={[styles.banner, { backgroundColor: theme.callRed + '14' }]}>
        <AppIcon name="info" size={15} color={theme.callRed} />
        <ThemedText type="small" style={[styles.text, { color: theme.callRed }]}>
          {lineError}
        </ThemedText>
        <SpringPressable onPress={retryLine}>
          <ThemedText type="smallBold" style={{ color: theme.callRed }}>
            Retry
          </ThemedText>
        </SpringPressable>
      </View>
    );
  }

  if (!lineReady) {
    return (
      <View style={[styles.banner, { backgroundColor: theme.primary + '14' }]}>
        <ActivityIndicator size="small" color={theme.primary} />
        <ThemedText type="small" themeColor="textSecondary" style={styles.text}>
          Connecting your line…
        </ThemedText>
      </View>
    );
  }

  if (showReadyFlash) {
    return (
      <View style={[styles.banner, { backgroundColor: theme.callGreen + '14' }]}>
        <AppIcon name="check" size={15} color={theme.callGreen} />
        <ThemedText type="small" style={[styles.text, { color: theme.callGreen }]}>
          Your line is ready — you can call now.
        </ThemedText>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    marginBottom: Spacing.two,
  },
  text: {
    flex: 1,
  },
});
