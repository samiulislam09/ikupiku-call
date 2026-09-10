import { useMemo } from 'react';
import {
    Modal,
    Platform,
    StyleSheet,
    Text,
    View
} from 'react-native';
import Animated, {
    FadeIn,
    FadeInDown
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppIcon } from '@/components/ui/app-icon';
import { SpringPressable } from '@/components/ui/spring-pressable';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useCall } from '@/context/call-context';
import { useKeypad } from '@/context/keypad-context';
import { useTheme } from '@/hooks/use-theme';

interface KeypadKeyConfig {
  digit: string;
  letters?: string;
}

const KEYPAD_KEYS: KeypadKeyConfig[][] = [
  [
    { digit: '1', letters: '' },
    { digit: '2', letters: 'A B C' },
    { digit: '3', letters: 'D E F' },
  ],
  [
    { digit: '4', letters: 'G H I' },
    { digit: '5', letters: 'J K L' },
    { digit: '6', letters: 'M N O' },
  ],
  [
    { digit: '7', letters: 'P Q R S' },
    { digit: '8', letters: 'T U V' },
    { digit: '9', letters: 'W X Y Z' },
  ],
  [
    { digit: '*', letters: '' },
    { digit: '0', letters: '+' },
    { digit: '#', letters: '' },
  ],
];

function DialKey({
  item,
  onPress,
  onLongPress,
}: {
  item: KeypadKeyConfig;
  onPress: () => void;
  onLongPress?: () => void;
}) {
  const theme = useTheme();

  return (
    <SpringPressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
      scaleTo={0.91}
      style={[
        styles.keypadButton,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.border,
        },
      ]}>
      <Text style={[styles.keyDigit, { color: theme.text }]}>
        {item.digit}
      </Text>
      {item.letters ? (
        <Text style={[styles.keyLetters, { color: theme.textSecondary }]}>
          {item.letters}
        </Text>
      ) : (
        <View style={styles.letterSpacer} />
      )}
    </SpringPressable>
  );
}

export function KeypadModal() {
  const {
    isKeypadVisible,
    closeKeypad,
    dialedNumber,
    pressDigit,
    deleteDigit,
    clearNumber,
  } = useKeypad();
  const theme = useTheme();
  const { startCall } = useCall();

  const handlePlaceCall = () => {
    closeKeypad();
    startCall({
      name: dialedNumber || 'Unknown Caller',
      number: dialedNumber || '+1 (555) 000-0000',
      label: 'Mobile',
      avatarColor: theme.primary,
    });
  };

  // Format dialed number with spaces
  const formattedNumber = useMemo(() => {
    if (!dialedNumber) return '';
    const clean = dialedNumber.replace(/\s+/g, '');
    if (clean.startsWith('+')) {
      return clean.replace(/(\+\d{1,3})(\d{3})?(\d{3})?(\d+)?/, (m, p1, p2, p3, p4) => {
        return [p1, p2, p3, p4].filter(Boolean).join(' ');
      });
    }
    if (clean.length <= 3) return clean;
    if (clean.length <= 6) return `${clean.slice(0, 3)} ${clean.slice(3)}`;
    if (clean.length <= 10)
      return `${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6)}`;
    return `${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6, 10)} ${clean.slice(10)}`;
  }, [dialedNumber]);

  return (
    <Modal
      visible={isKeypadVisible}
      animationType="slide"
      transparent={false}
      onRequestClose={closeKeypad}>
      <ThemedView style={styles.modalBackground}>
        <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.safeArea}>
          {/* Drag Handle Bar & Close */}
          <View style={styles.topHandleBar}>
            <View
              style={[
                styles.sheetDragPill,
                { backgroundColor: theme.border },
              ]}
            />
          </View>

          <View style={styles.headerBar}>
            <SpringPressable
              onPress={closeKeypad}
              hitSlop={12}
              style={[styles.headerCircleBtn, { backgroundColor: theme.backgroundElement }]}>
              <AppIcon name="close" size={20} color={theme.text} />
            </SpringPressable>

            {dialedNumber.length > 0 ? (
              <Animated.View entering={FadeIn.duration(200)}>
                <SpringPressable
                  onPress={() => {}}
                  style={[
                    styles.addContactPill,
                    {
                      backgroundColor: theme.primary + '18',
                      borderColor: theme.primary + '30',
                    },
                  ]}>
                  <AppIcon name="contacts" size={14} color={theme.primary} />
                  <ThemedText type="smallBold" style={{ color: theme.primary }}>
                    Add to Contacts
                  </ThemedText>
                </SpringPressable>
              </Animated.View>
            ) : (
              <ThemedText
                type="smallBold"
                style={styles.keypadTitle}
                themeColor="textSecondary">
                KEYPAD
              </ThemedText>
            )}

            <View style={styles.headerPlaceholder} />
          </View>

          {/* Number Display Area */}
          <View style={styles.displayArea}>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.45}
              style={[
                styles.numberText,
                {
                  color: theme.text,
                },
              ]}>
              {formattedNumber || ' '}
            </Text>

            {/* Quick Action Chips when number is typed */}
            {dialedNumber.length > 0 && (
              <Animated.View
                entering={FadeInDown.duration(200)}
                style={styles.quickChipsRow}>
                <SpringPressable
                  onPress={handlePlaceCall}
                  style={[
                    styles.chip,
                    { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                  ]}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Audio Call
                  </ThemedText>
                </SpringPressable>

                <SpringPressable
                  style={[
                    styles.chip,
                    { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                  ]}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Message
                  </ThemedText>
                </SpringPressable>
              </Animated.View>
            )}
          </View>

          {/* 3x4 Dialpad Grid */}
          <View style={styles.gridContainer}>
            {KEYPAD_KEYS.map((row, rowIndex) => (
              <View key={`row-${rowIndex}`} style={styles.keypadRow}>
                {row.map((item) => (
                  <DialKey
                    key={item.digit}
                    item={item}
                    onPress={() => pressDigit(item.digit)}
                    onLongPress={() => {
                      if (item.digit === '0') {
                        pressDigit('+');
                      }
                    }}
                  />
                ))}
              </View>
            ))}
          </View>

          {/* Bottom Action Footer */}
          <View style={styles.bottomBar}>
            {/* Left: Close Keypad */}
            <SpringPressable
              onPress={closeKeypad}
              hitSlop={12}
              style={[
                styles.bottomSideButton,
                { backgroundColor: theme.backgroundElement },
              ]}>
              <AppIcon name="close" size={24} color={theme.textSecondary} />
            </SpringPressable>

            {/* Center: Glowing Green Call Button */}
            <SpringPressable
              scaleTo={0.92}
              onPress={handlePlaceCall}
              style={[
                styles.callButton,
                { backgroundColor: theme.callGreen },
              ]}>
              <AppIcon name="phone" size={32} color="#FFFFFF" />
            </SpringPressable>

            {/* Right: Backspace Button */}
            {dialedNumber.length > 0 ? (
              <Animated.View entering={FadeIn.duration(150)}>
                <SpringPressable
                  onPress={deleteDigit}
                  onLongPress={clearNumber}
                  delayLongPress={300}
                  hitSlop={12}
                  style={[
                    styles.bottomSideButton,
                    { backgroundColor: theme.backgroundElement },
                  ]}>
                  <AppIcon name="backspace" size={22} color={theme.text} />
                </SpringPressable>
              </Animated.View>
            ) : (
              <View style={styles.bottomSideButton} />
            )}
          </View>
        </SafeAreaView>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackground: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  topHandleBar: {
    width: '100%',
    alignItems: 'center',
    paddingTop: Spacing.two,
  },
  sheetDragPill: {
    width: 42,
    height: 5,
    borderRadius: 3,
  },
  headerBar: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    minHeight: 48,
  },
  headerCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addContactPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  keypadTitle: {
    letterSpacing: 1.5,
    fontSize: 12,
  },
  headerPlaceholder: {
    width: 36,
  },
  displayArea: {
    width: '100%',
    minHeight: 80,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.two,
    gap: 8,
  },
  numberText: {
    fontSize: 38,
    fontWeight: '700',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  quickChipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  gridContainer: {
    width: '100%',
    maxWidth: 340,
    gap: 16,
    paddingHorizontal: Spacing.two,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  keypadButton: {
    width: 74,
    height: 74,
    borderRadius: 37,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        cursor: 'pointer',
        userSelect: 'none',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
      },
    }),
  },
  keyDigit: {
    fontSize: 30,
    fontWeight: '600',
    lineHeight: 34,
  },
  keyLetters: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    marginTop: -1,
  },
  letterSpacer: {
    height: 10,
  },
  bottomBar: {
    width: '100%',
    maxWidth: 340,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.three,
    paddingHorizontal: Spacing.two,
  },
  bottomSideButton: {
    width: 58,
    height: 58,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 29,
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
  callButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    ...Platform.select({
      ios: {
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.5,
        shadowRadius: 14,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 6px 22px rgba(16, 185, 129, 0.45)',
        cursor: 'pointer',
      },
    }),
  },
});
