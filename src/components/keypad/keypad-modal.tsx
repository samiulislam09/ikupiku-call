import {
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppIcon } from '@/components/ui/app-icon';
import { MaxContentWidth, Spacing } from '@/constants/theme';
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

  return (
    <Modal
      visible={isKeypadVisible}
      animationType="slide"
      transparent={false}
      onRequestClose={closeKeypad}>
      <ThemedView style={styles.modalBackground}>
        <SafeAreaView style={styles.safeArea}>
          {/* Header Bar */}
          <View style={styles.headerBar}>
            <Pressable
              onPress={closeKeypad}
              hitSlop={12}
              style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}>
              <AppIcon name="close" size={24} color={theme.textSecondary} />
            </Pressable>

            {dialedNumber.length > 0 ? (
              <Pressable
                onPress={() => {
                  // Design only for now
                }}
                style={({ pressed }) => [styles.addContactButton, pressed && styles.pressed]}>
                <ThemedText type="smallBold" style={{ color: theme.primary }}>
                  + Add to Contacts
                </ThemedText>
              </Pressable>
            ) : (
              <ThemedText type="small" themeColor="textSecondary">
                Keypad
              </ThemedText>
            )}

            <View style={styles.headerPlaceholder} />
          </View>

          {/* Number Display Area */}
          <View style={styles.displayArea}>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.5}
              style={[
                styles.numberText,
                {
                  color: theme.text,
                },
              ]}>
              {dialedNumber || ' '}
            </Text>
          </View>

          {/* 3x4 Dialpad Grid */}
          <View style={styles.gridContainer}>
            {KEYPAD_KEYS.map((row, rowIndex) => (
              <View key={`row-${rowIndex}`} style={styles.keypadRow}>
                {row.map((item) => (
                  <Pressable
                    key={item.digit}
                    onPress={() => pressDigit(item.digit)}
                    onLongPress={() => {
                      if (item.digit === '0') {
                        pressDigit('+');
                      }
                    }}
                    delayLongPress={400}
                    style={({ pressed }) => [
                      styles.keypadButton,
                      {
                        backgroundColor: pressed
                          ? theme.backgroundSelected
                          : theme.backgroundElement,
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
                  </Pressable>
                ))}
              </View>
            ))}
          </View>

          {/* Bottom Controls Bar */}
          <View style={styles.bottomBar}>
            {/* Left: Dismiss Dialpad */}
            <Pressable
              onPress={closeKeypad}
              hitSlop={12}
              style={({ pressed }) => [styles.bottomSideButton, pressed && styles.pressed]}>
              <AppIcon name="close" size={26} color={theme.textSecondary} />
            </Pressable>

            {/* Center: Green Call Button */}
            <Pressable
              onPress={() => {
                // Calling functionality will be implemented later
              }}
              style={({ pressed }) => [
                styles.callButton,
                { backgroundColor: theme.callGreen },
                pressed && styles.callButtonPressed,
              ]}>
              <AppIcon name="phone" size={32} color="#FFFFFF" />
            </Pressable>

            {/* Right: Backspace / Clear Button */}
            {dialedNumber.length > 0 ? (
              <Pressable
                onPress={deleteDigit}
                onLongPress={clearNumber}
                delayLongPress={350}
                hitSlop={12}
                style={({ pressed }) => [
                  styles.bottomSideButton,
                  pressed && styles.pressed,
                ]}>
                <AppIcon name="backspace" size={26} color={theme.textSecondary} />
              </Pressable>
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
  headerBar: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    minHeight: 44,
  },
  headerButton: {
    padding: Spacing.one,
    borderRadius: Spacing.two,
  },
  addContactButton: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
  },
  headerPlaceholder: {
    width: 32,
  },
  displayArea: {
    width: '100%',
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.two,
  },
  numberText: {
    fontSize: 34,
    fontWeight: '600',
    letterSpacing: 2,
    textAlign: 'center',
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
    ...Platform.select({
      web: {
        cursor: 'pointer',
        userSelect: 'none',
      },
    }),
  },
  keyDigit: {
    fontSize: 28,
    fontWeight: '500',
    lineHeight: 32,
  },
  keyLetters: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 1.5,
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
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 30,
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
  callButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#16A34A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0 4px 14px rgba(22, 163, 74, 0.4)',
        cursor: 'pointer',
      },
    }),
  },
  callButtonPressed: {
    transform: [{ scale: 0.95 }],
    opacity: 0.9,
  },
  pressed: {
    opacity: 0.6,
  },
});

