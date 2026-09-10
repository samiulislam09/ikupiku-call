import React, { useState, useEffect } from 'react';
import {
  Modal,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { AppIcon } from '@/components/ui/app-icon';
import { SpringPressable } from '@/components/ui/spring-pressable';
import { Spacing } from '@/constants/theme';
import { useCall } from '@/context/call-context';
import { useThemeContext } from '@/context/theme-context';

interface SimulateCallModalProps {
  visible: boolean;
  onClose: () => void;
}

export function SimulateCallModal({ visible, onClose }: SimulateCallModalProps) {
  const { theme, isDark } = useThemeContext();
  const { scheduleTestIncomingCall } = useCall();
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isScheduled, setIsScheduled] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    if (countdown !== null && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((c) => (c !== null && c > 1 ? c - 1 : null));
      }, 1000);
    } else if (countdown === 0 || (countdown === null && isScheduled)) {
      setIsScheduled(false);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [countdown, isScheduled]);

  const handleStart = async (seconds: number) => {
    setIsScheduled(true);
    setCountdown(seconds);
    await scheduleTestIncomingCall(seconds, {
      name: 'Sarah Jenkins',
      number: '+1 (555) 342-9812',
      label: 'Mobile',
      avatarColor: '#F43F5E',
    });
  };

  const handleCancel = () => {
    setCountdown(null);
    setIsScheduled(false);
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.45)' }]}>
        <Animated.View
          entering={FadeInDown.springify()}
          exiting={FadeOutDown}
          style={[
            styles.card,
            {
              backgroundColor: theme.background,
              borderColor: theme.border,
            },
          ]}>
          <SafeAreaView edges={['bottom']}>
            {/* Header */}
            <View style={styles.header}>
              <View style={[styles.iconWrapper, { backgroundColor: theme.primary + '18' }]}>
                <AppIcon name="phone" size={24} color={theme.primary} />
              </View>
              <ThemedText type="subtitle" style={[styles.title, { color: theme.text }]}>
                Test Closed-App Call
              </ThemedText>
              <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
                Test receiving & answering an incoming call when the app is minimized or killed.
              </ThemedText>
            </View>

            {/* Countdown Active State */}
            {countdown !== null ? (
              <View style={[styles.countdownBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <ThemedText style={[styles.countdownNumber, { color: theme.primary }]}>
                  {countdown}s
                </ThemedText>
                <ThemedText style={[styles.countdownHint, { color: theme.text }]}>
                  Lock your screen or close the app NOW!
                </ThemedText>
                <ThemedText style={[styles.countdownSubhint, { color: theme.textSecondary }]}>
                  When the notification rings, tap "Answer" to verify the app wakes up and connects.
                </ThemedText>

                <SpringPressable
                  scaleTo={0.94}
                  onPress={handleCancel}
                  style={[styles.cancelBtn, { backgroundColor: theme.backgroundElement }]}>
                  <ThemedText style={[styles.cancelText, { color: theme.text }]}>Cancel Test</ThemedText>
                </SpringPressable>
              </View>
            ) : (
              /* Ready to Start */
              <View style={styles.content}>
                <View style={[styles.instructionsBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <View style={styles.stepRow}>
                    <View style={[styles.stepDot, { backgroundColor: theme.primary }]}>
                      <ThemedText style={styles.stepNum}>1</ThemedText>
                    </View>
                    <ThemedText style={[styles.stepText, { color: theme.text }]}>
                      Tap <ThemedText type="smallBold" style={{ color: theme.primary }}>Start (5 seconds)</ThemedText> below.
                    </ThemedText>
                  </View>

                  <View style={styles.stepRow}>
                    <View style={[styles.stepDot, { backgroundColor: theme.primary }]}>
                      <ThemedText style={styles.stepNum}>2</ThemedText>
                    </View>
                    <ThemedText style={[styles.stepText, { color: theme.text }]}>
                      Immediately press the phone's Home button or lock the screen.
                    </ThemedText>
                  </View>

                  <View style={styles.stepRow}>
                    <View style={[styles.stepDot, { backgroundColor: theme.primary }]}>
                      <ThemedText style={styles.stepNum}>3</ThemedText>
                    </View>
                    <ThemedText style={[styles.stepText, { color: theme.text }]}>
                      Phone will ring with "Answer" & "Decline" actions.
                    </ThemedText>
                  </View>

                  <View style={styles.stepRow}>
                    <View style={[styles.stepDot, { backgroundColor: theme.callGreen }]}>
                      <ThemedText style={styles.stepNum}>4</ThemedText>
                    </View>
                    <ThemedText style={[styles.stepText, { color: theme.text }]}>
                      Tap <ThemedText type="smallBold" style={{ color: theme.callGreen }}>Answer</ThemedText> to launch straight into active in-call mode!
                    </ThemedText>
                  </View>
                </View>

                {/* Actions */}
                <View style={styles.buttonRow}>
                  <SpringPressable
                    scaleTo={0.94}
                    onPress={() => handleStart(5)}
                    style={[styles.primaryActionBtn, { backgroundColor: theme.callGreen }]}>
                    <AppIcon name="phone" size={18} color="#FFFFFF" />
                    <ThemedText style={styles.actionBtnText}>Start in 5s</ThemedText>
                  </SpringPressable>

                  <SpringPressable
                    scaleTo={0.94}
                    onPress={() => handleStart(10)}
                    style={[styles.primaryActionBtn, { backgroundColor: theme.primary }]}>
                    <AppIcon name="clock" size={18} color="#FFFFFF" />
                    <ThemedText style={styles.actionBtnText}>Start in 10s</ThemedText>
                  </SpringPressable>
                </View>

                <SpringPressable
                  scaleTo={0.96}
                  onPress={onClose}
                  style={[styles.closeBtn, { backgroundColor: theme.backgroundElement }]}>
                  <ThemedText style={[styles.closeBtnText, { color: theme.textSecondary }]}>Close</ThemedText>
                </SpringPressable>
              </View>
            )}
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
    zIndex: 999,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    borderWidth: 1,
    padding: Spacing.five,
    ...Platform.select({
      web: {
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
      } as any,
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 10,
      },
    }),
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
  iconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: Spacing.two,
  },
  content: {
    width: '100%',
  },
  instructionsBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.four,
    marginBottom: Spacing.four,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  stepDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.three,
    flexShrink: 0,
  },
  stepNum: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  stepText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  primaryActionBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  closeBtn: {
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.two,
  },
  closeBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  countdownBox: {
    alignItems: 'center',
    padding: Spacing.six,
    borderRadius: 20,
    borderWidth: 1,
  },
  countdownNumber: {
    fontSize: 52,
    fontWeight: '800',
    marginBottom: Spacing.two,
  },
  countdownHint: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Spacing.two,
  },
  countdownSubhint: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: Spacing.five,
  },
  cancelBtn: {
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.two,
    borderRadius: 10,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
