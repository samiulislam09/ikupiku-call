import { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIcon } from '@/components/ui/app-icon';
import { useKeypad } from '@/context/keypad-context';
import { useTheme } from '@/hooks/use-theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function FloatingKeypadButton() {
  const { openKeypad, isKeypadVisible } = useKeypad();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  // Animation values
  const scale = useSharedValue(1);
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.4);

  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.22, { duration: 1600 }),
        withTiming(1, { duration: 1600 })
      ),
      -1,
      true
    );
    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 1600 }),
        withTiming(0.4, { duration: 1600 })
      ),
      -1,
      true
    );
  }, []);

  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const animatedPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  // If keypad is already visible, hide the FAB
  if (isKeypadVisible) {
    return null;
  }

  const bottomPosition =
    Platform.OS === 'web' ? 76 : Math.max(insets.bottom, 16) + 68;

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.container,
        {
          bottom: bottomPosition,
        },
      ]}>
      {/* Animated Glowing Aura */}
      <Animated.View
        style={[
          styles.glowAura,
          {
            backgroundColor: theme.primary,
          },
          animatedPulseStyle,
        ]}
      />

      <AnimatedPressable
        onPress={openKeypad}
        onPressIn={() => {
          scale.value = withSpring(0.88, { damping: 12, stiffness: 280 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 14, stiffness: 300 });
        }}
        accessibilityLabel="Open Keypad"
        accessibilityRole="button"
        style={[
          styles.fab,
          {
            backgroundColor: theme.primary,
          },
          animatedButtonStyle,
        ]}>
        <AppIcon name="dialpad" size={26} color="#FFFFFF" />
      </AnimatedPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 20,
    zIndex: 999,
    alignItems: 'center',
    justifyContent: 'center',
    width: 68,
    height: 68,
  },
  glowAura: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    ...Platform.select({
      ios: {
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.45,
        shadowRadius: 12,
      },
      android: {
        elevation: 10,
      },
      web: {
        boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)',
        cursor: 'pointer',
      },
    }),
  },
});
