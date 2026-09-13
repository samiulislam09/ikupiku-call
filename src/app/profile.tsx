import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
    Image,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FloatingKeypadButton } from '@/components/keypad/floating-keypad-button';
import { EditProfileModal } from '@/components/profile/edit-profile-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppIcon } from '@/components/ui/app-icon';
import { SpringPressable } from '@/components/ui/spring-pressable';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useCall } from '@/context/call-context';
import { ThemeMode, useThemeContext } from '@/context/theme-context';
import { useUserProfile } from '@/context/user-profile-context';
import { useTheme } from '@/hooks/use-theme';
import { appStorage } from '@/utils/storage';

function formatRemainingTime(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

function parseDurationSeconds(dur?: string): number {
  if (!dur || dur === 'Canceled') return 0;
  let total = 0;
  const minMatch = dur.match(/(\d+)m/);
  const secMatch = dur.match(/(\d+)s/);
  if (minMatch) total += parseInt(minMatch[1], 10) * 60;
  if (secMatch) total += parseInt(secMatch[1], 10);
  return total;
}

function getInitials(name: string): string {
  if (!name) return 'ME';
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export default function ProfileScreen() {
  const theme = useTheme();
  const { isDark, themeMode, setThemeMode } = useThemeContext();
  const { receiveIncomingCall, callLogs } = useCall();
  const { profile } = useUserProfile();
  const { user, logout, refreshMe } = useAuth();
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refreshMe();
    }, [refreshMe])
  );

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Compute calling stats dynamically from call history
  const totalSeconds = useMemo(() => {
    return callLogs.reduce((acc, c) => acc + parseDurationSeconds(c.duration), 0);
  }, [callLogs]);

  const formattedTotalTime = useMemo(() => {
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hours > 0) return `${hours}h ${mins}m`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  }, [totalSeconds]);

  // Persisted toggle states in localStorage
  const [hdVoice, setHdVoiceState] = useState(() =>
    appStorage.getJSON('ilubilu_setting_hd_voice', true)
  );
  const [spamBlocker, setSpamBlockerState] = useState(() =>
    appStorage.getJSON('ilubilu_setting_spam_blocker', true)
  );
  const [callWaiting, setCallWaitingState] = useState(() =>
    appStorage.getJSON('ilubilu_setting_call_waiting', false)
  );

  const setHdVoice = (val: boolean) => {
    setHdVoiceState(val);
    appStorage.setJSON('ilubilu_setting_hd_voice', val);
  };
  const setSpamBlocker = (val: boolean) => {
    setSpamBlockerState(val);
    appStorage.setJSON('ilubilu_setting_spam_blocker', val);
  };
  const setCallWaiting = (val: boolean) => {
    setCallWaitingState(val);
    appStorage.setJSON('ilubilu_setting_call_waiting', val);
  };

  const themeOptions: { label: string; mode: ThemeMode; icon: 'sun' | 'moon' | 'palette' }[] = [
    { label: 'System', mode: 'system', icon: 'palette' },
    { label: 'Light', mode: 'light', icon: 'sun' },
    { label: 'Dark', mode: 'dark', icon: 'moon' },
  ];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.headerRow}>
            <ThemedText type="title" style={styles.title}>
              Profile
            </ThemedText>
            <SpringPressable
              scaleTo={0.92}
              onPress={() => setIsEditModalVisible(true)}
              style={[
                styles.editProfileBtn,
                { backgroundColor: theme.primary + '18', borderColor: theme.primary + '30' },
              ]}>
              <AppIcon name="camera" size={14} color={theme.primary} />
              <ThemedText type="smallBold" style={{ color: theme.primary }}>
                Edit Profile
              </ThemedText>
            </SpringPressable>
          </View>

          {/* User Profile Card with Glowing Aura */}
          <SpringPressable
            scaleTo={0.98}
            onPress={() => setIsEditModalVisible(true)}
            style={[
              styles.profileCard,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}>
            <View style={styles.avatarGlowContainer}>
              <View
                style={[
                  styles.avatarAura,
                  { backgroundColor: (profile.avatarColor || theme.primary) + '25' },
                ]}
              />
              <View
                style={[
                  styles.avatarLarge,
                  { backgroundColor: profile.avatarColor || theme.primary },
                ]}>
                {profile.photoUri ? (
                  <Image
                    source={{ uri: profile.photoUri }}
                    style={styles.profileAvatarImage}
                    resizeMode="cover"
                  />
                ) : (
                  <ThemedText type="subtitle" style={styles.avatarText}>
                    {getInitials(profile.name)}
                  </ThemedText>
                )}
                <View
                  style={[
                    styles.onlineBadge,
                    { backgroundColor: theme.callGreen },
                  ]}
                />
              </View>

              {/* Camera Icon Badge */}
              <View style={[styles.avatarCameraBadge, { backgroundColor: theme.primary }]}>
                <AppIcon name="camera" size={11} color="#FFFFFF" />
              </View>
            </View>

            <View style={styles.profileInfo}>
              <View style={styles.nameEditRow}>
                <ThemedText type="subtitle" style={styles.userName}>
                  {profile.name}
                </ThemedText>
                <View style={[styles.editPillSmall, { backgroundColor: theme.primary + '14' }]}>
                  <ThemedText style={{ color: theme.primary, fontSize: 11, fontWeight: '700' }}>
                    Edit
                  </ThemedText>
                </View>
              </View>
              <ThemedText type="default" themeColor="textSecondary">
                {profile.phone}
              </ThemedText>

              <View
                style={[
                  styles.statusPill,
                  {
                    backgroundColor: theme.backgroundElement,
                    borderColor: theme.border,
                  },
                ]}>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: theme.callGreen },
                  ]}
                />
                <ThemedText type="smallBold" themeColor="text">
                  Connected • HD Audio • 18ms
                </ThemedText>
              </View>
            </View>
          </SpringPressable>

          {/* Section: Calling Statistics */}
          <Animated.View
            entering={FadeInDown.delay(50).springify()}
            style={[
              styles.statsContainer,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}>
            <View style={styles.statItem}>
              <View style={[styles.statIconCircle, { backgroundColor: theme.callGreen + '16' }]}>
                <AppIcon name="clock" size={16} color={theme.callGreen} />
              </View>
              <ThemedText style={styles.statValue}>
                {formattedTotalTime}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.statLabel}>
                Talk Time
              </ThemedText>
            </View>

            <View style={[styles.statDivider, { backgroundColor: theme.border }]} />

            <View style={styles.statItem}>
              <View style={[styles.statIconCircle, { backgroundColor: theme.primary + '16' }]}>
                <AppIcon name="phone" size={16} color={theme.primary} />
              </View>
              <ThemedText style={styles.statValue}>
                {callLogs.length}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.statLabel}>
                Total Calls
              </ThemedText>
            </View>

            <View style={[styles.statDivider, { backgroundColor: theme.border }]} />

            <View style={styles.statItem}>
              <View style={[styles.statIconCircle, { backgroundColor: theme.callRed + '16' }]}>
                <AppIcon name="block" size={16} color={theme.callRed} />
              </View>
              <ThemedText style={styles.statValue}>
                {spamBlocker ? '14' : '0'}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.statLabel}>
                Spam Blocked
              </ThemedText>
            </View>
          </Animated.View>

          {/* Section: Account */}
          <Animated.View
            entering={FadeInDown.delay(60).springify()}
            style={styles.section}>
            <ThemedText
              type="smallBold"
              style={styles.sectionTitle}
              themeColor="textSecondary">
              ACCOUNT
            </ThemedText>

            <View
              style={[
                styles.groupCard,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}>
              {/* Phone number */}
              <View style={styles.rowItem}>
                <View style={styles.rowLeft}>
                  <View
                    style={[
                      styles.iconBox,
                      { backgroundColor: theme.primary + '18' },
                    ]}>
                    <AppIcon name="profile" size={18} color={theme.primary} />
                  </View>
                  <View style={styles.rowTexts}>
                    <ThemedText type="default" style={styles.rowTitle}>
                      {user?.phone ?? 'Not signed in'}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      Signed-in account
                    </ThemedText>
                  </View>
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: theme.border }]} />

              {/* Free talk time */}
              <View style={styles.rowItem}>
                <View style={styles.rowLeft}>
                  <View
                    style={[
                      styles.iconBox,
                      { backgroundColor: theme.callGreen + '18' },
                    ]}>
                    <AppIcon name="clock" size={18} color={theme.callGreen} />
                  </View>
                  <View style={styles.rowTexts}>
                    <ThemedText type="default" style={styles.rowTitle}>
                      Free talk time
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      Remaining balance for PSTN calls
                    </ThemedText>
                  </View>
                </View>
                <ThemedText type="smallBold" style={{ color: theme.callGreen }}>
                  {formatRemainingTime(user?.remainingSeconds ?? 0)}
                </ThemedText>
              </View>

              <View style={[styles.divider, { backgroundColor: theme.border }]} />

              {/* Log out */}
              <SpringPressable
                scaleTo={0.98}
                onPress={handleLogout}
                disabled={isLoggingOut}
                style={[styles.rowItem, { opacity: isLoggingOut ? 0.6 : 1 }]}>
                <View style={styles.rowLeft}>
                  <View
                    style={[
                      styles.iconBox,
                      { backgroundColor: theme.callRed + '18' },
                    ]}>
                    <AppIcon name="phone-down" size={18} color={theme.callRed} />
                  </View>
                  <View style={styles.rowTexts}>
                    <ThemedText
                      type="default"
                      style={[styles.rowTitle, { color: theme.callRed }]}>
                      Log out
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      Sign out of your ilubilu account
                    </ThemedText>
                  </View>
                </View>
              </SpringPressable>
            </View>
          </Animated.View>

          {/* Section: Appearance & Theme */}
          <Animated.View
            entering={FadeInDown.delay(70).springify()}
            style={styles.section}>
            <ThemedText
              type="smallBold"
              style={styles.sectionTitle}
              themeColor="textSecondary">
              APPEARANCE & THEME
            </ThemedText>

            <View
              style={[
                styles.groupCard,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}>
              {/* Theme Preference Segmented Control */}
              <View style={styles.themeSelectorContainer}>
                <View style={styles.themeHeaderRow}>
                  <View
                    style={[
                      styles.iconBox,
                      {
                        backgroundColor: isDark
                          ? '#818CF825'
                          : '#F59E0B20',
                      },
                    ]}>
                    <AppIcon
                      name={isDark ? 'moon' : 'sun'}
                      size={18}
                      color={isDark ? '#818CF8' : '#D97706'}
                    />
                  </View>
                  <View style={styles.rowTexts}>
                    <ThemedText type="default" style={styles.rowTitle}>
                      Theme Preference
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {themeMode === 'system'
                        ? `System default (${isDark ? 'Dark' : 'Light'})`
                        : themeMode === 'dark'
                        ? 'Dark mode active'
                        : 'Light mode active'}
                    </ThemedText>
                  </View>
                </View>

                {/* Theme Mode Segmented Buttons */}
                <View
                  style={[
                    styles.themePillsContainer,
                    { backgroundColor: theme.backgroundElement },
                  ]}>
                  {themeOptions.map((opt) => {
                    const isSelected = themeMode === opt.mode;
                    return (
                      <SpringPressable
                        key={opt.mode}
                        scaleTo={0.94}
                        onPress={() => setThemeMode(opt.mode)}
                        style={[
                          styles.themePill,
                          isSelected && {
                            backgroundColor: theme.card,
                            ...styles.activeSegmentShadow,
                          },
                        ]}>
                        <AppIcon
                          name={opt.icon}
                          size={15}
                          color={
                            isSelected ? theme.primary : theme.textSecondary
                          }
                        />
                        <ThemedText
                          type="smallBold"
                          style={{
                            color: isSelected
                              ? theme.primary
                              : theme.textSecondary,
                            fontSize: 13,
                          }}>
                          {opt.label}
                        </ThemedText>
                      </SpringPressable>
                    );
                  })}
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Section: Calling Preferences */}
          <Animated.View
            entering={FadeInDown.delay(140).springify()}
            style={styles.section}>
            <ThemedText
              type="smallBold"
              style={styles.sectionTitle}
              themeColor="textSecondary">
              CALLING PREFERENCES
            </ThemedText>

            <View
              style={[
                styles.groupCard,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}>
              {/* Simulate Incoming Call Quick Test */}
              <SpringPressable
                scaleTo={0.97}
                onPress={() =>
                  receiveIncomingCall({
                    name: 'David Miller',
                    number: '+1 (555) 762-1104',
                    label: 'Work',
                    avatarColor: '#3B82F6',
                  })
                }
                style={styles.rowItem}>
                <View style={styles.rowLeft}>
                  <View
                    style={[
                      styles.iconBox,
                      { backgroundColor: theme.callGreen + '20' },
                    ]}>
                    <AppIcon name="phone-incoming" size={18} color={theme.callGreen} />
                  </View>
                  <View style={styles.rowTexts}>
                    <ThemedText type="default" style={[styles.rowTitle, { color: theme.callGreen, fontWeight: '700' }]}>
                      Simulate Incoming Call
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      Test radar ringing & accept/decline screen
                    </ThemedText>
                  </View>
                </View>
                <View
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 12,
                    backgroundColor: theme.callGreen,
                  }}>
                  <ThemedText style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700' }}>
                    Test Call
                  </ThemedText>
                </View>
              </SpringPressable>

              <View style={[styles.divider, { backgroundColor: theme.border }]} />

              {/* HD Voice */}
              <View style={styles.rowItem}>
                <View style={styles.rowLeft}>
                  <View
                    style={[
                      styles.iconBox,
                      { backgroundColor: theme.primary + '18' },
                    ]}>
                    <AppIcon name="mic" size={18} color={theme.primary} />
                  </View>
                  <View style={styles.rowTexts}>
                    <ThemedText type="default" style={styles.rowTitle}>
                      Ultra HD Voice
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      Noise cancellation & high bitrate audio
                    </ThemedText>
                  </View>
                </View>
                <Switch
                  value={hdVoice}
                  onValueChange={setHdVoice}
                  trackColor={{ false: theme.border, true: theme.callGreen }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={[styles.divider, { backgroundColor: theme.border }]} />

              {/* Spam Protection */}
              <View style={styles.rowItem}>
                <View style={styles.rowLeft}>
                  <View
                    style={[
                      styles.iconBox,
                      { backgroundColor: theme.callGreen + '18' },
                    ]}>
                    <AppIcon name="phone" size={18} color={theme.callGreen} />
                  </View>
                  <View style={styles.rowTexts}>
                    <ThemedText type="default" style={styles.rowTitle}>
                      Caller ID & Spam Blocker
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      Screen known telemarketers & robocalls
                    </ThemedText>
                  </View>
                </View>
                <Switch
                  value={spamBlocker}
                  onValueChange={setSpamBlocker}
                  trackColor={{ false: theme.border, true: theme.callGreen }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={[styles.divider, { backgroundColor: theme.border }]} />

              {/* Voicemail */}
              <SpringPressable
                scaleTo={0.98}
                style={styles.rowItem}>
                <View style={styles.rowLeft}>
                  <View
                    style={[
                      styles.iconBox,
                      { backgroundColor: '#F59E0B18' },
                    ]}>
                    <AppIcon name="dialpad" size={18} color="#F59E0B" />
                  </View>
                  <View style={styles.rowTexts}>
                    <ThemedText type="default" style={styles.rowTitle}>
                      Voicemail & Greetings
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      1 unread message • Tap to manage
                    </ThemedText>
                  </View>
                </View>
                <ThemedText type="smallBold" style={{ color: theme.primary }}>
                  View
                </ThemedText>
              </SpringPressable>
            </View>
          </Animated.View>

          {/* Section: Connectivity & Network */}
          <Animated.View
            entering={FadeInDown.delay(200).springify()}
            style={styles.section}>
            <ThemedText
              type="smallBold"
              style={styles.sectionTitle}
              themeColor="textSecondary">
              CONNECTIVITY & PRIVACY
            </ThemedText>

            <View
              style={[
                styles.groupCard,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}>
              {/* Call Waiting */}
              <View style={styles.rowItem}>
                <View style={styles.rowLeft}>
                  <View
                    style={[
                      styles.iconBox,
                      { backgroundColor: '#8B5CF618' },
                    ]}>
                    <AppIcon name="phone" size={18} color="#8B5CF6" />
                  </View>
                  <View style={styles.rowTexts}>
                    <ThemedText type="default" style={styles.rowTitle}>
                      Call Waiting
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      Notify me of incoming calls while on a call
                    </ThemedText>
                  </View>
                </View>
                <Switch
                  value={callWaiting}
                  onValueChange={setCallWaiting}
                  trackColor={{ false: theme.border, true: theme.callGreen }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={[styles.divider, { backgroundColor: theme.border }]} />

              {/* Blocked Numbers */}
              <SpringPressable
                scaleTo={0.98}
                style={styles.rowItem}>
                <View style={styles.rowLeft}>
                  <View
                    style={[
                      styles.iconBox,
                      { backgroundColor: theme.callRed + '18' },
                    ]}>
                    <AppIcon name="close" size={18} color={theme.callRed} />
                  </View>
                  <View style={styles.rowTexts}>
                    <ThemedText type="default" style={styles.rowTitle}>
                      Blocked Contacts
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      3 blocked numbers
                    </ThemedText>
                  </View>
                </View>
                <ThemedText type="small" themeColor="textSecondary">
                  Edit ›
                </ThemedText>
              </SpringPressable>
            </View>
          </Animated.View>

          {/* Section: Audio & Sound */}
          <Animated.View
            entering={FadeInDown.delay(260).springify()}
            style={styles.section}>
            <ThemedText
              type="smallBold"
              style={styles.sectionTitle}
              themeColor="textSecondary">
              AUDIO & SOUNDS
            </ThemedText>

            <View
              style={[
                styles.groupCard,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}>
              <SpringPressable
                scaleTo={0.98}
                style={styles.rowItem}>
                <View style={styles.rowLeft}>
                  <View
                    style={[
                      styles.iconBox,
                      { backgroundColor: '#EC489918' },
                    ]}>
                    <AppIcon name="volume" size={18} color="#EC4899" />
                  </View>
                  <View style={styles.rowTexts}>
                    <ThemedText type="default" style={styles.rowTitle}>
                      Ringtone & Vibration
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      Default (Metro Chime)
                    </ThemedText>
                  </View>
                </View>
                <ThemedText type="small" themeColor="textSecondary">
                  ›
                </ThemedText>
              </SpringPressable>
            </View>
          </Animated.View>

          {/* Section: VoIP Network Diagnostics */}
          <Animated.View
            entering={FadeInDown.delay(300).springify()}
            style={styles.section}>
            <ThemedText
              type="smallBold"
              style={styles.sectionTitle}
              themeColor="textSecondary">
              VOIP NETWORK & AUDIO DIAGNOSTICS
            </ThemedText>

            <View
              style={[
                styles.groupCard,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}>
              {/* Protocol */}
              <View style={styles.diagnosticsRow}>
                <ThemedText type="small" themeColor="textSecondary">
                  Protocol
                </ThemedText>
                <ThemedText type="smallBold">
                  WebRTC / SIP over TLS
                </ThemedText>
              </View>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />

              {/* Codec */}
              <View style={styles.diagnosticsRow}>
                <ThemedText type="small" themeColor="textSecondary">
                  Audio Codec
                </ThemedText>
                <ThemedText type="smallBold" style={{ color: theme.callGreen }}>
                  Opus HD • 48 kHz
                </ThemedText>
              </View>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />

              {/* Latency */}
              <View style={styles.diagnosticsRow}>
                <ThemedText type="small" themeColor="textSecondary">
                  Round-Trip Latency
                </ThemedText>
                <View style={styles.diagValueRow}>
                  <View style={[styles.pingDot, { backgroundColor: theme.callGreen }]} />
                  <ThemedText type="smallBold">18 ms (Optimal)</ThemedText>
                </View>
              </View>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />

              {/* Jitter & Loss */}
              <View style={styles.diagnosticsRow}>
                <ThemedText type="small" themeColor="textSecondary">
                  Jitter & Packet Loss
                </ThemedText>
                <ThemedText type="smallBold">
                  1.2 ms • 0.0% loss
                </ThemedText>
              </View>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />

              {/* Encryption */}
              <View style={styles.diagnosticsRow}>
                <ThemedText type="small" themeColor="textSecondary">
                  Encryption
                </ThemedText>
                <ThemedText type="smallBold">
                  SRTP / AES-128 GCM
                </ThemedText>
              </View>
            </View>
          </Animated.View>

          {/* App Footer Info */}
          <View style={styles.footer}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.footerText}>
              ilubilu Calling App • v1.0.0
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.footerSubText}>
              All mock designs ready for calling engine integration.
            </ThemedText>
          </View>
        </ScrollView>

        {/* Edit Profile Modal */}
        <EditProfileModal
          visible={isEditModalVisible}
          onClose={() => setIsEditModalVisible(false)}
        />

        {/* Floating Keypad Button */}
        <FloatingKeypadButton />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    flexDirection: 'row',
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
  },
  scrollContent: {
    paddingBottom: 84,
    paddingTop: Spacing.two,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: Spacing.two,
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  header: {
    paddingBottom: Spacing.two,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  profileCard: {
    alignItems: 'center',
    padding: Spacing.four,
    borderRadius: 22,
    borderWidth: 1,
    marginBottom: Spacing.four,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.05)',
      },
    }),
  },
  avatarGlowContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
    position: 'relative',
  },
  avatarAura: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  avatarLarge: {
    width: 82,
    height: 82,
    borderRadius: 41,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderWidth: 2.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    overflow: 'hidden',
  },
  profileAvatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarCameraBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  nameEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editPillSmall: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 34,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  profileInfo: {
    alignItems: 'center',
    gap: 4,
  },
  userName: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 7,
    marginTop: Spacing.two,
    borderWidth: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  section: {
    marginBottom: Spacing.four,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: Spacing.two,
    paddingHorizontal: Spacing.one,
  },
  groupCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 6,
      },
      android: {
        elevation: 1,
      },
      web: {
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)',
      },
    }),
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.three,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    flex: 1,
    paddingRight: Spacing.two,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowTexts: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginLeft: 62,
  },
  themeSelectorContainer: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  themeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  themePillsContainer: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 3,
    gap: 4,
  },
  themePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 11,
  },
  activeSegmentShadow: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      },
    }),
  },
  footer: {
    alignItems: 'center',
    paddingVertical: Spacing.four,
    gap: 4,
  },
  footerText: {
    fontSize: 13,
    fontWeight: '600',
  },
  footerSubText: {
    fontSize: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.two,
    marginBottom: Spacing.four,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
      },
      android: {
        elevation: 1,
      },
      web: {
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
      },
    }),
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
    gap: 4,
  },
  statIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: 36,
  },
  diagnosticsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: 12,
  },
  diagValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pingDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
});
