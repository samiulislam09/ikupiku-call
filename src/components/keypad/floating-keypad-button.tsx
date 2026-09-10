import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIcon } from '@/components/ui/app-icon';
import { BottomTabInset } from '@/constants/theme';
import { useKeypad } from '@/context/keypad-context';
import { useTheme } from '@/hooks/use-theme';

export function FloatingKeypadButton() {
  const { openKeypad, isKeypadVisible } = useKeypad();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  // If keypad is already visible, hide the FAB
  if (isKeypadVisible) {
    return null;
  }

  // Float right above the bottom tab bar + safe area
  const bottomPosition =
    Platform.OS === 'web'
      ? 80
      : insets.bottom + BottomTabInset + 16;

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.container,
        {
          bottom: bottomPosition,
        },
      ]}>
      <Pressable
        onPress={openKeypad}
        accessibilityLabel="Open Keypad"
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.fab,
          {
            backgroundColor: theme.primary,
          },
          pressed && styles.fabPressed,
        ]}>
        <AppIcon name="dialpad" size={26} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 20,
    zIndex: 999,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)',
        cursor: 'pointer',
      },
    }),
  },
  fabPressed: {
    transform: [{ scale: 0.94 }],
    opacity: 0.9,
  },
});

