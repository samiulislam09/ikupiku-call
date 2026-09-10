import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { AppIcon } from '@/components/ui/app-icon';
import { SpringPressable } from '@/components/ui/spring-pressable';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface KeypadKey {
  digit: string;
  letters?: string;
}

const KEYS: KeypadKey[] = [
  { digit: '1' },
  { digit: '2', letters: 'ABC' },
  { digit: '3', letters: 'DEF' },
  { digit: '4', letters: 'GHI' },
  { digit: '5', letters: 'JKL' },
  { digit: '6', letters: 'MNO' },
  { digit: '7', letters: 'PQRS' },
  { digit: '8', letters: 'TUV' },
  { digit: '9', letters: 'WXYZ' },
  { digit: '*' },
  { digit: '0', letters: '+' },
  { digit: '#' },
];

interface InCallKeypadProps {
  onClose: () => void;
}

export function InCallKeypad({ onClose }: InCallKeypadProps) {
  const theme = useTheme();
  const [typedDigits, setTypedDigits] = useState('');

  const handlePress = (digit: string) => {
    setTypedDigits((prev) => prev + digit);
  };

  return (
    <Animated.View
      entering={FadeInDown.springify()}
      exiting={FadeOutDown}
      style={[
        styles.container,
        {
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          borderTopColor: 'rgba(255, 255, 255, 0.12)',
        },
      ]}>
      {/* Header with entered digits and Hide button */}
      <View style={styles.header}>
        <View style={styles.typedContainer}>
          <ThemedText style={styles.typedText}>
            {typedDigits || 'Tap digits for DTMF'}
          </ThemedText>
        </View>
        <SpringPressable
          scaleTo={0.92}
          onPress={onClose}
          style={styles.hideButton}>
          <ThemedText style={styles.hideText}>Hide</ThemedText>
          <AppIcon name="close" size={16} color="#FFFFFF" />
        </SpringPressable>
      </View>

      {/* 3x4 Grid */}
      <View style={styles.grid}>
        {KEYS.map((item) => (
          <SpringPressable
            key={item.digit}
            scaleTo={0.88}
            onPress={() => handlePress(item.digit)}
            style={styles.keyButton}>
            <ThemedText style={styles.keyDigit}>{item.digit}</ThemedText>
            {item.letters && (
              <ThemedText style={styles.keyLetters}>{item.letters}</ThemedText>
            )}
          </SpringPressable>
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.six,
    paddingHorizontal: Spacing.four,
    zIndex: 100,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(20px)',
      } as any,
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.three,
    paddingHorizontal: Spacing.two,
  },
  typedContainer: {
    flex: 1,
  },
  typedText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 2,
  },
  hideButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  hideText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    gap: 12,
  },
  keyButton: {
    width: 72,
    height: 60,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  keyDigit: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 26,
  },
  keyLetters: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
  },
});

