import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
    Modal,
    Platform,
    SafeAreaView,
    StyleSheet,
    View,
} from 'react-native';
import Animated, {
    Easing,
    FadeInDown,
    FadeInUp,
    FadeOut,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withSequence,
    withTiming
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { AppIcon, IconName } from '@/components/ui/app-icon';
import { SpringPressable } from '@/components/ui/spring-pressable';
import { Spacing } from '@/constants/theme';
import { useCall } from '@/context/call-context';
import { useThemeContext } from '@/context/theme-context';
import { InCallContactsSheet } from './in-call-contacts-sheet';
import { InCallKeypad } from './in-call-keypad';

export function CallingModal() {
  const { theme, isDark } = useThemeContext();
  const [isInCallContactsOpen, setIsInCallContactsOpen] = useState(false);
  const {
    callStatus,
    caller,
    formattedDuration,
    isMuted,
    isSpeakerOn,
    isOnHold,
    isInCallKeypadOpen,
    isMinimized,
    lineReady,
    lineError,
    acceptCall,
    declineCall,
    endCall,
    toggleMute,
    toggleSpeaker,
    toggleHold,
    toggleKeypad,
    setIsMinimized,
  } = useCall();

  // Minimal one-line line-status hint: the specific error when there is
  // one, otherwise a quiet "still connecting" note while the softphone
  // line isn't ready yet, otherwise nothing at all.
  const lineStatusText = lineError ? lineError : !lineReady ? 'Line: connecting…' : null;

  // Pulse animation values for incoming radar rings
  const ring1Scale = useSharedValue(1);
  const ring1Opacity = useSharedValue(0.6);
  const ring2Scale = useSharedValue(1);
  const ring2Opacity = useSharedValue(0.5);
  const ring3Scale = useSharedValue(1);
  const ring3Opacity = useSharedValue(0.4);

  // Equalizer bar heights for active call
  const bar1 = useSharedValue(8);
  const bar2 = useSharedValue(16);
  const bar3 = useSharedValue(24);
  const bar4 = useSharedValue(12);
  const bar5 = useSharedValue(18);

  // Incoming call ring pulse animation
  useEffect(() => {
    if (callStatus === 'incoming') {
      ring1Scale.value = withRepeat(
        withTiming(1.5, { duration: 1800, easing: Easing.out(Easing.ease) }),
        -1,
        false
      );
      ring1Opacity.value = withRepeat(
        withTiming(0, { duration: 1800, easing: Easing.out(Easing.ease) }),
        -1,
        false
      );

      ring2Scale.value = withDelay(
        400,
        withRepeat(
          withTiming(1.85, { duration: 1800, easing: Easing.out(Easing.ease) }),
          -1,
          false
        )
      );
      ring2Opacity.value = withDelay(
        400,
        withRepeat(
          withTiming(0, { duration: 1800, easing: Easing.out(Easing.ease) }),
          -1,
          false
        )
      );

      ring3Scale.value = withDelay(
        800,
        withRepeat(
          withTiming(2.2, { duration: 1800, easing: Easing.out(Easing.ease) }),
          -1,
          false
        )
      );
      ring3Opacity.value = withDelay(
        800,
        withRepeat(
          withTiming(0, { duration: 1800, easing: Easing.out(Easing.ease) }),
          -1,
          false
        )
      );
    }
  }, [callStatus]);

  // Audio wave visualizer animation
  useEffect(() => {
    if (callStatus === 'connected' && !isOnHold) {
      const animateBar = (val: typeof bar1, minH: number, maxH: number, dur: number) => {
        val.value = withRepeat(
          withSequence(
            withTiming(maxH, { duration: dur }),
            withTiming(minH, { duration: dur })
          ),
          -1,
          true
        );
      };
      animateBar(bar1, 6, 22, 350);
      animateBar(bar2, 10, 30, 420);
      animateBar(bar3, 8, 36, 300);
      animateBar(bar4, 12, 28, 480);
      animateBar(bar5, 6, 20, 390);
    }
  }, [callStatus, isOnHold]);

  const ring1Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring1Scale.value }],
    opacity: ring1Opacity.value,
  }));
  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring2Scale.value }],
    opacity: ring2Opacity.value,
  }));
  const ring3Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring3Scale.value }],
    opacity: ring3Opacity.value,
  }));

  const bar1Style = useAnimatedStyle(() => ({ height: bar1.value }));
  const bar2Style = useAnimatedStyle(() => ({ height: bar2.value }));
  const bar3Style = useAnimatedStyle(() => ({ height: bar3.value }));
  const bar4Style = useAnimatedStyle(() => ({ height: bar4.value }));
  const bar5Style = useAnimatedStyle(() => ({ height: bar5.value }));

  if (callStatus === 'idle') {
    return null;
  }

  const getInitials = (name: string) => {
    if (name.startsWith('+')) return '#';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const isIncoming = callStatus === 'incoming';
  const isOutgoing = callStatus === 'outgoing';
  const isConnected = callStatus === 'connected';
  const isEnded = callStatus === 'ended';

  // Minimized Top Island Bar
  if (isMinimized && isConnected) {
    return (
      <Animated.View
        entering={FadeInUp.springify()}
        exiting={FadeOut}
        style={[
          styles.minimizedIsland,
          {
            backgroundColor: isDark ? 'rgba(15, 23, 42, 0.94)' : 'rgba(255, 255, 255, 0.96)',
            borderColor: theme.border,
          },
        ]}>
        <SpringPressable
          scaleTo={0.96}
          onPress={() => setIsMinimized(false)}
          style={styles.minimizedContent}>
          <View
            style={[
              styles.miniAvatar,
              { backgroundColor: (caller.avatarColor || theme.primary) + '25' },
            ]}>
            <ThemedText style={[styles.miniAvatarText, { color: caller.avatarColor || theme.primary }]}>
              {getInitials(caller.name)}
            </ThemedText>
          </View>
          <View style={styles.miniDetails}>
            <ThemedText style={[styles.miniName, { color: theme.text }]} numberOfLines={1}>
              {caller.name}
            </ThemedText>
            <View style={styles.miniStatusRow}>
              <View
                style={[
                  styles.miniStatusDot,
                  { backgroundColor: isOnHold ? '#F59E0B' : theme.callGreen },
                ]}
              />
              <ThemedText
                style={[
                  styles.miniTimer,
                  { color: isOnHold ? '#F59E0B' : theme.callGreen },
                ]}>
                {isOnHold ? 'On Hold' : formattedDuration}
              </ThemedText>
            </View>
          </View>
          <View style={styles.miniRightActions}>
            <View style={[styles.miniTapToReturnBadge, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText style={[styles.miniReturnText, { color: theme.textSecondary }]}>Tap to open</ThemedText>
            </View>
            <SpringPressable
              scaleTo={0.88}
              onPress={endCall}
              style={[styles.miniEndButton, { backgroundColor: theme.callRed }]}>
              <AppIcon name="phone-down" size={16} color="#FFFFFF" />
            </SpringPressable>
          </View>
        </SpringPressable>
      </Animated.View>
    );
  }

  return (
    <Modal
      visible={true}
      animationType="fade"
      transparent={false}
      statusBarTranslucent>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <SafeAreaView style={styles.safeArea}>
          {/* Top Bar with Quality & Minimize */}
          <View style={styles.topBar}>
            {isConnected ? (
              <SpringPressable
                scaleTo={0.9}
                onPress={() => setIsMinimized(true)}
                style={[styles.topIconButton, { backgroundColor: theme.backgroundElement }]}>
                <AppIcon name="close" size={20} color={theme.text} />
              </SpringPressable>
            ) : (
              <View style={{ width: 40 }} />
            )}

            <View style={[styles.qualityPill, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View
                style={[
                  styles.qualityDot,
                  { backgroundColor: isConnected ? theme.callGreen : theme.primary },
                ]}
              />
              <ThemedText style={[styles.qualityText, { color: theme.textSecondary }]}>
                {isConnected
                  ? 'HD Voice • Opus 48kHz'
                  : 'End-to-End Encrypted'}
              </ThemedText>
            </View>

            <View style={{ width: 40 }} />
          </View>

          {/* Caller Hero Section */}
          <View style={styles.heroSection}>
            {/* Concentric Radar Rings for Incoming Call */}
            <View style={styles.avatarWrapper}>
              {isIncoming && (
                <>
                  <Animated.View
                    style={[
                      styles.radarRing,
                      { backgroundColor: theme.callGreen + '20' },
                      ring3Style,
                    ]}
                  />
                  <Animated.View
                    style={[
                      styles.radarRing,
                      { backgroundColor: theme.callGreen + '35' },
                      ring2Style,
                    ]}
                  />
                  <Animated.View
                    style={[
                      styles.radarRing,
                      { backgroundColor: theme.callGreen + '50' },
                      ring1Style,
                    ]}
                  />
                </>
              )}

              {/* Caller Avatar */}
              <View
                style={[
                  styles.avatar,
                  {
                    backgroundColor: caller.avatarColor || theme.primary,
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.08)',
                  },
                ]}>
                <ThemedText style={styles.avatarText}>
                  {getInitials(caller.name)}
                </ThemedText>
              </View>
            </View>

            {/* Caller Name & Subtitle */}
            <ThemedText style={[styles.callerName, { color: theme.text }]}>{caller.name}</ThemedText>
            <ThemedText style={[styles.callerNumber, { color: theme.textSecondary }]}>
              {caller.label ? `${caller.label} • ` : ''}
              {caller.number}
            </ThemedText>

            {lineStatusText && (
              <ThemedText
                style={[styles.lineStatusText, { color: lineError ? theme.callRed : theme.textSecondary }]}>
                {lineStatusText}
              </ThemedText>
            )}

            {/* Status / Live Duration Visualizer */}
            <View style={styles.statusRow}>
              {isIncoming && (
                <View style={[styles.incomingBadge, { backgroundColor: theme.callGreen + '18', borderColor: theme.callGreen + '40' }]}>
                  <ThemedText style={[styles.incomingText, { color: theme.callGreen }]}>
                    Incoming Call...
                  </ThemedText>
                </View>
              )}

              {isOutgoing && (
                <View style={[styles.outgoingBadge, { backgroundColor: theme.primary + '18', borderColor: theme.primary + '40' }]}>
                  <ThemedText style={[styles.outgoingText, { color: theme.primary }]}>
                    Calling...
                  </ThemedText>
                </View>
              )}

              {isConnected && (
                <View style={styles.connectedContainer}>
                  {isOnHold ? (
                    <View style={styles.holdBadge}>
                      <AppIcon name="pause" size={14} color="#F59E0B" />
                      <ThemedText style={styles.holdText}>On Hold</ThemedText>
                    </View>
                  ) : (
                    <>
                      {/* Live Timer */}
                      <ThemedText style={[styles.durationTimer, { color: theme.text }]}>
                        {formattedDuration}
                      </ThemedText>

                      {/* Dancing Equalizer Waveform */}
                      <View style={styles.equalizer}>
                        <Animated.View style={[styles.eqBar, { backgroundColor: theme.callGreen }, bar1Style]} />
                        <Animated.View style={[styles.eqBar, { backgroundColor: theme.callGreen }, bar2Style]} />
                        <Animated.View style={[styles.eqBar, { backgroundColor: theme.callGreen }, bar3Style]} />
                        <Animated.View style={[styles.eqBar, { backgroundColor: theme.callGreen }, bar4Style]} />
                        <Animated.View style={[styles.eqBar, { backgroundColor: theme.callGreen }, bar5Style]} />
                      </View>
                    </>
                  )}
                </View>
              )}

              {isEnded && (
                <View style={[styles.endedBadge, { backgroundColor: theme.callRed + '18', borderColor: theme.callRed + '40' }]}>
                  <ThemedText style={[styles.endedText, { color: theme.callRed }]}>Call Ended</ThemedText>
                </View>
              )}
            </View>
          </View>

          {/* Bottom Actions Section */}
          <View style={styles.bottomSection}>
            {/* Incoming Call Controls: Quick chips + Accept/Decline */}
            {isIncoming && (
              <Animated.View
                entering={FadeInDown.springify()}
                style={styles.incomingControls}>
                {/* Quick actions chips */}
                <View style={styles.quickChipsRow}>
                  <SpringPressable
                    scaleTo={0.92}
                    onPress={() => declineCall()}
                    style={[styles.quickChip, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <AppIcon name="clock" size={15} color={theme.textSecondary} />
                    <ThemedText style={[styles.quickChipText, { color: theme.text }]}>
                      Remind Me
                    </ThemedText>
                  </SpringPressable>
                  <SpringPressable
                    scaleTo={0.92}
                    onPress={() => declineCall()}
                    style={[styles.quickChip, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <AppIcon name="message" size={15} color={theme.textSecondary} />
                    <ThemedText style={[styles.quickChipText, { color: theme.text }]}>
                      Message
                    </ThemedText>
                  </SpringPressable>
                </View>

                {/* Decline and Accept Buttons */}
                <View style={styles.incomingButtonsRow}>
                  <View style={styles.actionCol}>
                    <SpringPressable
                      scaleTo={0.88}
                      onPress={declineCall}
                      style={[
                        styles.bigActionButton,
                        { backgroundColor: theme.callRed },
                      ]}>
                      <AppIcon name="phone-down" size={32} color="#FFFFFF" />
                    </SpringPressable>
                    <ThemedText style={[styles.buttonLabel, { color: theme.text }]}>Decline</ThemedText>
                  </View>

                  <View style={styles.actionCol}>
                    <SpringPressable
                      scaleTo={0.88}
                      onPress={acceptCall}
                      style={[
                        styles.bigActionButton,
                        { backgroundColor: theme.callGreen },
                      ]}>
                      <AppIcon name="phone" size={32} color="#FFFFFF" />
                    </SpringPressable>
                    <ThemedText style={[styles.buttonLabel, { color: theme.text }]}>Accept</ThemedText>
                  </View>
                </View>
              </Animated.View>
            )}

            {/* Outgoing or Connected Call Controls */}
            {(isConnected || isOutgoing) && (
              <Animated.View
                entering={FadeInDown.springify()}
                style={styles.activeControls}>
                {/* 6-Button In-Call Grid */}
                <View style={styles.controlsGrid}>
                  {/* Mute */}
                  <InCallButton
                    icon={isMuted ? 'mic-off' : 'mic'}
                    label={isMuted ? 'Unmute' : 'Mute'}
                    active={isMuted}
                    onPress={toggleMute}
                  />

                  {/* Keypad */}
                  <InCallButton
                    icon="dialpad"
                    label="Keypad"
                    active={isInCallKeypadOpen}
                    onPress={toggleKeypad}
                  />

                  {/* Speaker */}
                  <InCallButton
                    icon="volume"
                    label="Speaker"
                    active={isSpeakerOn}
                    onPress={toggleSpeaker}
                  />

                  {/* Add Call */}
                  <InCallButton
                    icon="user-plus"
                    label="Add Call"
                    onPress={() => {}}
                  />

                  {/* Contacts */}
                  <InCallButton
                    icon="contacts"
                    label="Contacts"
                    onPress={() => setIsInCallContactsOpen(true)}
                  />

                  {/* Hold */}
                  <InCallButton
                    icon="pause"
                    label={isOnHold ? 'Resume' : 'Hold'}
                    active={isOnHold}
                    onPress={toggleHold}
                  />
                </View>

                {/* Big Red End Call Button */}
                <View style={styles.endCallContainer}>
                  <SpringPressable
                    scaleTo={0.88}
                    onPress={endCall}
                    style={[
                      styles.bigEndCallButton,
                      { backgroundColor: theme.callRed },
                    ]}>
                    <AppIcon name="phone-down" size={34} color="#FFFFFF" />
                  </SpringPressable>
                  <ThemedText style={[styles.buttonLabel, { color: theme.textSecondary }]}>End Call</ThemedText>
                </View>
              </Animated.View>
            )}
          </View>
        </SafeAreaView>

        {/* DTMF In-Call Keypad Overlay */}
        {isInCallKeypadOpen && (
          <InCallKeypad onClose={toggleKeypad} />
        )}

        {/* In-Call Contacts Lookup Sheet */}
        <InCallContactsSheet
          visible={isInCallContactsOpen}
          onClose={() => setIsInCallContactsOpen(false)}
        />
      </View>
    </Modal>
  );
}

interface InCallButtonProps {
  icon: IconName;
  label: string;
  active?: boolean;
  onPress: () => void;
}

function InCallButton({ icon, label, active, onPress }: InCallButtonProps) {
  const { theme, isDark } = useThemeContext();
  return (
    <View style={styles.inCallButtonCol}>
      <SpringPressable
        scaleTo={0.88}
        onPress={onPress}
        style={[
          styles.inCallButton,
          {
            backgroundColor: active ? theme.primary : theme.card,
            borderColor: active ? theme.primary : theme.border,
            ...(Platform.OS === 'web'
              ? {
                  boxShadow: isDark
                    ? '0 4px 14px rgba(0, 0, 0, 0.4)'
                    : '0 2px 8px rgba(0, 0, 0, 0.06)',
                  cursor: 'pointer',
                }
              : {}),
          },
        ]}>
        <AppIcon
          name={icon}
          size={24}
          color={active ? '#FFFFFF' : theme.text}
        />
      </SpringPressable>
      <ThemedText
        style={[
          styles.inCallLabel,
          {
            color: active ? theme.primary : theme.textSecondary,
            fontWeight: active ? '700' : '500',
          },
        ]}>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'android' ? 24 : 8,
  },
  topIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  qualityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  qualityDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  qualityText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  heroSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.four,
  },
  avatarWrapper: {
    width: 130,
    height: 130,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.four,
    position: 'relative',
  },
  radarRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
      },
      android: {
        elevation: 10,
      },
      web: {
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
      },
    }),
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 40,
    fontWeight: '800',
  },
  callerName: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 4,
    textAlign: 'center',
  },
  callerNumber: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: Spacing.three,
  },
  lineStatusText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: -Spacing.two,
    marginBottom: Spacing.two,
  },
  statusRow: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
  },
  incomingBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  incomingText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  outgoingBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  outgoingText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  connectedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  durationTimer: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 1,
  },
  equalizer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 36,
  },
  eqBar: {
    width: 3.5,
    borderRadius: 2,
  },
  holdBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  holdText: {
    color: '#F59E0B',
    fontSize: 13,
    fontWeight: '700',
  },
  endedBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  endedText: {
    fontSize: 14,
    fontWeight: '700',
  },
  bottomSection: {
    paddingBottom: Platform.OS === 'ios' ? 24 : 36,
  },
  incomingControls: {
    gap: Spacing.four,
  },
  quickChipsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 14,
    marginBottom: Spacing.two,
  },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  quickChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  incomingButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: Spacing.three,
  },
  actionCol: {
    alignItems: 'center',
    gap: 8,
  },
  bigActionButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
        cursor: 'pointer',
      },
    }),
  },
  buttonLabel: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  activeControls: {
    gap: Spacing.four,
  },
  controlsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 18,
    paddingHorizontal: Spacing.two,
  },
  inCallButtonCol: {
    width: '30%',
    alignItems: 'center',
    gap: 6,
  },
  inCallButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  inCallLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  endCallContainer: {
    alignItems: 'center',
    gap: 8,
    marginTop: Spacing.two,
  },
  bigEndCallButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#F43F5E',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.45,
        shadowRadius: 16,
      },
      android: {
        elevation: 10,
      },
      web: {
        boxShadow: '0 8px 28px rgba(244, 63, 94, 0.5)',
        cursor: 'pointer',
      },
    }),
  },
  minimizedIsland: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 16 : 48,
    left: 20,
    right: 20,
    zIndex: 9999,
    borderRadius: 24,
    borderWidth: 1,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(20px)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
      } as any,
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 14,
      },
    }),
  },
  minimizedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 12,
  },
  miniAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniAvatarText: {
    fontSize: 14,
    fontWeight: '700',
  },
  miniDetails: {
    flex: 1,
    gap: 2,
  },
  miniName: {
    fontSize: 14,
    fontWeight: '700',
  },
  miniStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  miniStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  miniTimer: {
    fontSize: 12,
    fontWeight: '600',
  },
  miniRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  miniTapToReturnBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  miniReturnText: {
    fontSize: 10,
    fontWeight: '600',
  },
  miniEndButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
