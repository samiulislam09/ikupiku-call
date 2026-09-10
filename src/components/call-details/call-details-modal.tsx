import React from 'react';
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppIcon } from '@/components/ui/app-icon';
import { SpringPressable } from '@/components/ui/spring-pressable';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface CallRecord {
  id: string;
  name: string;
  number: string;
  type: 'incoming' | 'outgoing' | 'missed';
  time: string;
  section: 'Today' | 'Yesterday' | 'Older';
  label: string;
  duration?: string;
  avatarColor: string;
}

interface CallDetailsModalProps {
  call: CallRecord | null;
  visible: boolean;
  onClose: () => void;
}

export function CallDetailsModal({ call, visible, onClose }: CallDetailsModalProps) {
  const theme = useTheme();

  if (!call) return null;

  const getInitials = (name: string) => {
    if (name.startsWith('+')) return '#';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const isMissed = call.type === 'missed';
  const statusColor =
    call.type === 'missed'
      ? theme.callRed
      : call.type === 'incoming'
      ? theme.callGreen
      : theme.primary;

  const statusLabel =
    call.type === 'missed'
      ? 'Missed Call'
      : call.type === 'incoming'
      ? 'Incoming Call'
      : 'Outgoing Call';

  const iconName =
    call.type === 'missed'
      ? 'phone-missed'
      : call.type === 'incoming'
      ? 'phone-incoming'
      : 'phone-outgoing';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}>
      <ThemedView style={styles.container}>
        <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.safeArea}>
          {/* Top Bar */}
          <View style={styles.headerBar}>
            <SpringPressable
              scaleTo={0.9}
              onPress={onClose}
              hitSlop={12}
              style={[
                styles.iconCircleButton,
                { backgroundColor: theme.backgroundElement },
              ]}>
              <AppIcon name="back" size={20} color={theme.text} />
            </SpringPressable>

            <ThemedText type="smallBold" style={styles.headerTitle}>
              Call Details
            </ThemedText>

            <SpringPressable
              scaleTo={0.9}
              onPress={() => {}}
              hitSlop={12}
              style={[
                styles.iconCircleButton,
                { backgroundColor: theme.backgroundElement },
              ]}>
              <AppIcon name="share" size={18} color={theme.text} />
            </SpringPressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}>
            {/* Caller Profile Card */}
            <Animated.View
              entering={FadeInDown.duration(280).springify()}
              style={[
                styles.profileHeroCard,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}>
              <View style={styles.avatarWrapper}>
                <View
                  style={[
                    styles.avatarGlow,
                    { backgroundColor: call.avatarColor + '20' },
                  ]}
                />
                <View
                  style={[
                    styles.avatar,
                    {
                      backgroundColor: call.avatarColor + '25',
                      borderColor: call.avatarColor + '50',
                    },
                  ]}>
                  <ThemedText
                    type="subtitle"
                    style={[styles.avatarText, { color: call.avatarColor }]}>
                    {getInitials(call.name)}
                  </ThemedText>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: statusColor },
                  ]}>
                  <AppIcon name={iconName} size={12} color="#FFFFFF" />
                </View>
              </View>

              <ThemedText type="subtitle" style={styles.callerName}>
                {call.name}
              </ThemedText>

              <ThemedText type="default" themeColor="textSecondary" style={styles.callerNumber}>
                {call.label} • {call.number}
              </ThemedText>

              {/* Quick Actions Bar */}
              <View style={styles.quickActionsRow}>
                {/* Audio Call */}
                <View style={styles.actionItem}>
                  <SpringPressable
                    scaleTo={0.9}
                    onPress={() => {}}
                    style={[
                      styles.actionCircleBtn,
                      { backgroundColor: theme.callGreen },
                    ]}>
                    <AppIcon name="phone" size={22} color="#FFFFFF" />
                  </SpringPressable>
                  <ThemedText type="smallBold" style={styles.actionLabel}>
                    Call
                  </ThemedText>
                </View>

                {/* Video Call */}
                <View style={styles.actionItem}>
                  <SpringPressable
                    scaleTo={0.9}
                    onPress={() => {}}
                    style={[
                      styles.actionCircleBtn,
                      { backgroundColor: theme.primary },
                    ]}>
                    <AppIcon name="video" size={22} color="#FFFFFF" />
                  </SpringPressable>
                  <ThemedText type="smallBold" style={styles.actionLabel}>
                    Video
                  </ThemedText>
                </View>

                {/* Message */}
                <View style={styles.actionItem}>
                  <SpringPressable
                    scaleTo={0.9}
                    onPress={() => {}}
                    style={[
                      styles.actionCircleBtn,
                      { backgroundColor: theme.backgroundElement },
                    ]}>
                    <AppIcon name="message" size={20} color={theme.text} />
                  </SpringPressable>
                  <ThemedText type="smallBold" style={styles.actionLabel}>
                    Message
                  </ThemedText>
                </View>

                {/* Info / Contact */}
                <View style={styles.actionItem}>
                  <SpringPressable
                    scaleTo={0.9}
                    onPress={() => {}}
                    style={[
                      styles.actionCircleBtn,
                      { backgroundColor: theme.backgroundElement },
                    ]}>
                    <AppIcon name="info" size={20} color={theme.text} />
                  </SpringPressable>
                  <ThemedText type="smallBold" style={styles.actionLabel}>
                    Info
                  </ThemedText>
                </View>
              </View>
            </Animated.View>

            {/* Call History Timeline */}
            <Animated.View
              entering={FadeInDown.delay(80).springify()}
              style={styles.section}>
              <ThemedText
                type="smallBold"
                style={styles.sectionTitle}
                themeColor="textSecondary">
                CALL LOG TIMELINE
              </ThemedText>

              <View
                style={[
                  styles.groupCard,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}>
                {/* Current Call Record */}
                <View style={styles.timelineRow}>
                  <View
                    style={[
                      styles.timelineIconBox,
                      { backgroundColor: statusColor + '18' },
                    ]}>
                    <AppIcon name={iconName} size={18} color={statusColor} />
                  </View>
                  <View style={styles.timelineTexts}>
                    <View style={styles.timelineHeader}>
                      <ThemedText
                        type="default"
                        style={[
                          styles.timelineStatus,
                          isMissed && { color: theme.callRed },
                        ]}>
                        {statusLabel}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {call.time}
                      </ThemedText>
                    </View>
                    <ThemedText type="small" themeColor="textSecondary">
                      {isMissed
                        ? 'Rang for 18 seconds • Unanswered'
                        : `Duration: ${call.duration ?? '3m 15s'} • VoIP Line 1`}
                    </ThemedText>
                  </View>
                </View>

                <View style={[styles.divider, { backgroundColor: theme.border }]} />

                {/* Mock Past Call Event 1 */}
                <View style={styles.timelineRow}>
                  <View
                    style={[
                      styles.timelineIconBox,
                      { backgroundColor: theme.callGreen + '18' },
                    ]}>
                    <AppIcon name="phone-incoming" size={18} color={theme.callGreen} />
                  </View>
                  <View style={styles.timelineTexts}>
                    <View style={styles.timelineHeader}>
                      <ThemedText type="default" style={styles.timelineStatus}>
                        Incoming Call
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        Yesterday
                      </ThemedText>
                    </View>
                    <ThemedText type="small" themeColor="textSecondary">
                      Duration: 5m 42s • HD Voice
                    </ThemedText>
                  </View>
                </View>

                <View style={[styles.divider, { backgroundColor: theme.border }]} />

                {/* Mock Past Call Event 2 */}
                <View style={styles.timelineRow}>
                  <View
                    style={[
                      styles.timelineIconBox,
                      { backgroundColor: theme.primary + '18' },
                    ]}>
                    <AppIcon name="phone-outgoing" size={18} color={theme.primary} />
                  </View>
                  <View style={styles.timelineTexts}>
                    <View style={styles.timelineHeader}>
                      <ThemedText type="default" style={styles.timelineStatus}>
                        Outgoing Call
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        Oct 10
                      </ThemedText>
                    </View>
                    <ThemedText type="small" themeColor="textSecondary">
                      Duration: 1m 20s • Wi-Fi Calling
                    </ThemedText>
                  </View>
                </View>
              </View>
            </Animated.View>

            {/* Quick Management Options */}
            <Animated.View
              entering={FadeInDown.delay(160).springify()}
              style={styles.section}>
              <ThemedText
                type="smallBold"
                style={styles.sectionTitle}
                themeColor="textSecondary">
                CALL MANAGEMENT
              </ThemedText>

              <View
                style={[
                  styles.groupCard,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}>
                {/* Copy Number */}
                <SpringPressable scaleTo={0.98} style={styles.menuRow}>
                  <View style={styles.menuRowLeft}>
                    <AppIcon name="copy" size={18} color={theme.primary} />
                    <ThemedText type="default" style={styles.menuRowText}>
                      Copy Phone Number
                    </ThemedText>
                  </View>
                  <ThemedText type="small" themeColor="textSecondary">
                    {call.number}
                  </ThemedText>
                </SpringPressable>

                <View style={[styles.divider, { backgroundColor: theme.border }]} />

                {/* Add to Favorites */}
                <SpringPressable scaleTo={0.98} style={styles.menuRow}>
                  <View style={styles.menuRowLeft}>
                    <AppIcon name="star" size={18} color="#F59E0B" />
                    <ThemedText type="default" style={styles.menuRowText}>
                      Add to Favorites
                    </ThemedText>
                  </View>
                </SpringPressable>

                <View style={[styles.divider, { backgroundColor: theme.border }]} />

                {/* Block Contact */}
                <SpringPressable scaleTo={0.98} style={styles.menuRow}>
                  <View style={styles.menuRowLeft}>
                    <AppIcon name="block" size={18} color={theme.callRed} />
                    <ThemedText
                      type="default"
                      style={[styles.menuRowText, { color: theme.callRed }]}>
                      Block this Caller
                    </ThemedText>
                  </View>
                </SpringPressable>
              </View>
            </Animated.View>
          </ScrollView>
        </SafeAreaView>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    minHeight: 52,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  iconCircleButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six,
    paddingTop: Spacing.two,
  },
  profileHeroCard: {
    alignItems: 'center',
    padding: Spacing.four,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: Spacing.four,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
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
  avatarWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  avatarGlow: {
    position: 'absolute',
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  avatarText: {
    fontSize: 26,
    fontWeight: '800',
  },
  statusBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
  },
  callerName: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  callerNumber: {
    fontSize: 14,
    marginTop: 2,
    marginBottom: Spacing.four,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    maxWidth: 320,
  },
  actionItem: {
    alignItems: 'center',
    gap: 6,
  },
  actionCircleBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 4px 10px rgba(0, 0, 0, 0.1)',
        cursor: 'pointer',
      },
    }),
  },
  actionLabel: {
    fontSize: 12,
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
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    gap: Spacing.three,
  },
  timelineIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineTexts: {
    flex: 1,
    gap: 2,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timelineStatus: {
    fontWeight: '700',
    fontSize: 15,
  },
  divider: {
    height: 1,
    marginLeft: 62,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.three,
  },
  menuRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  menuRowText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
