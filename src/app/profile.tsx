import { useState } from 'react';
import {
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FloatingKeypadButton } from '@/components/keypad/floating-keypad-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppIcon } from '@/components/ui/app-icon';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { ThemeMode, useThemeContext } from '@/context/theme-context';
import { useTheme } from '@/hooks/use-theme';

export default function ProfileScreen() {
  const theme = useTheme();
  const { isDark, themeMode, toggleTheme, setThemeMode } = useThemeContext();

  // Mock toggle states for design preview
  const [hdVoice, setHdVoice] = useState(true);
  const [wifiCalling, setWifiCalling] = useState(true);
  const [spamBlocker, setSpamBlocker] = useState(true);
  const [callWaiting, setCallWaiting] = useState(false);

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
          <View style={styles.header}>
            <ThemedText type="title" style={styles.title}>
              Profile
            </ThemedText>
          </View>

          {/* User Profile Card */}
          <View
            style={[
              styles.profileCard,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}>
            <View
              style={[
                styles.avatarLarge,
                { backgroundColor: theme.primary },
              ]}>
              <ThemedText type="subtitle" style={styles.avatarText}>
                AM
              </ThemedText>
              <View
                style={[
                  styles.onlineBadge,
                  { backgroundColor: theme.callGreen },
                ]}
              />
            </View>

            <View style={styles.profileInfo}>
              <ThemedText type="subtitle" style={styles.userName}>
                Alex Morgan
              </ThemedText>
              <ThemedText type="default" themeColor="textSecondary">
                +1 (555) 019-2831
              </ThemedText>

              <View
                style={[
                  styles.statusPill,
                  { backgroundColor: theme.backgroundElement },
                ]}>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: theme.callGreen },
                  ]}
                />
                <ThemedText type="smallBold" themeColor="text">
                  Available • HD Voice Ready
                </ThemedText>
              </View>
            </View>
          </View>

          {/* Section: Appearance & Theme */}
          <View style={styles.section}>
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
              {/* Dark Theme Quick Switch */}
              <View style={styles.rowItem}>
                <View style={styles.rowLeft}>
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
                      Dark Theme
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {isDark ? 'Dark theme active' : 'Light theme active'}
                    </ThemedText>
                  </View>
                </View>
                <Switch
                  value={isDark}
                  onValueChange={toggleTheme}
                  trackColor={{ false: theme.border, true: theme.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={[styles.divider, { backgroundColor: theme.border }]} />

              {/* Theme Mode Segmented Buttons */}
              <View style={styles.themeSelectorContainer}>
                <ThemedText
                  type="small"
                  themeColor="textSecondary"
                  style={styles.themeSelectorLabel}>
                  Theme Preference:
                </ThemedText>

                <View
                  style={[
                    styles.themePillsContainer,
                    { backgroundColor: theme.backgroundElement },
                  ]}>
                  {themeOptions.map((opt) => {
                    const isSelected = themeMode === opt.mode;
                    return (
                      <Pressable
                        key={opt.mode}
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
                          size={14}
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
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>
          </View>

          {/* Section: Calling Preferences */}
          <View style={styles.section}>
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
              <Pressable
                style={({ pressed }) => [styles.rowItem, pressed && styles.pressed]}>
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
              </Pressable>
            </View>
          </View>

          {/* Section: Connectivity & Privacy */}
          <View style={styles.section}>
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
              {/* Wi-Fi Calling */}
              <View style={styles.rowItem}>
                <View style={styles.rowLeft}>
                  <View
                    style={[
                      styles.iconBox,
                      { backgroundColor: theme.primary + '18' },
                    ]}>
                    <AppIcon name="phone" size={18} color={theme.primary} />
                  </View>
                  <View style={styles.rowTexts}>
                    <ThemedText type="default" style={styles.rowTitle}>
                      Wi-Fi Calling
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      Make calls over local Wi-Fi networks
                    </ThemedText>
                  </View>
                </View>
                <Switch
                  value={wifiCalling}
                  onValueChange={setWifiCalling}
                  trackColor={{ false: theme.border, true: theme.callGreen }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={[styles.divider, { backgroundColor: theme.border }]} />

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
              <Pressable
                style={({ pressed }) => [styles.rowItem, pressed && styles.pressed]}>
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
              </Pressable>
            </View>
          </View>

          {/* Section: Audio & Sound */}
          <View style={styles.section}>
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
              <Pressable
                style={({ pressed }) => [styles.rowItem, pressed && styles.pressed]}>
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
              </Pressable>
            </View>
          </View>

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
  header: {
    paddingBottom: Spacing.two,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
  },
  profileCard: {
    alignItems: 'center',
    padding: Spacing.four,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: Spacing.four,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)',
      },
    }),
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: Spacing.two,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
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
    fontWeight: '700',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
    marginTop: Spacing.two,
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
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: Spacing.two,
    paddingHorizontal: Spacing.one,
  },
  groupCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
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
    width: 36,
    height: 36,
    borderRadius: 10,
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
    marginLeft: 58,
  },
  themeSelectorContainer: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  themeSelectorLabel: {
    fontSize: 13,
  },
  themePillsContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
    gap: 4,
  },
  themePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.two - 1,
    borderRadius: 9,
  },
  activeSegmentShadow: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.12,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
      web: {
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
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
    fontWeight: '500',
  },
  footerSubText: {
    fontSize: 12,
  },
  pressed: {
    opacity: 0.7,
  },
});
