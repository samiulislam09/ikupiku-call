import { useMemo, useState } from 'react';
import {
  FlatList,
  Platform,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CallDetailsModal, type CallRecord } from '@/components/call-details/call-details-modal';
import { SimulateCallModal } from '@/components/call/simulate-call-modal';
import { FloatingKeypadButton } from '@/components/keypad/floating-keypad-button';
import { LineStatusBanner } from '@/components/line-status-banner';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppIcon } from '@/components/ui/app-icon';
import { SpringPressable } from '@/components/ui/spring-pressable';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useCall } from '@/context/call-context';
import { useTheme } from '@/hooks/use-theme';

export default function CallLogsScreen() {
  const theme = useTheme();
  const { startCall, callLogs, deleteCallRecord, clearCallLogs } = useCall();
  const [filter, setFilter] = useState<'all' | 'missed' | 'outgoing'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedCall, setSelectedCall] = useState<CallRecord | null>(null);
  const [isSimulateModalOpen, setIsSimulateModalOpen] = useState(false);

  const filteredCalls = useMemo(() => {
    return callLogs.filter((call) => {
      if (filter === 'missed' && call.type !== 'missed') {
        return false;
      }
      if (filter === 'outgoing' && call.type !== 'outgoing') {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          call.name.toLowerCase().includes(q) || call.number.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [callLogs, filter, searchQuery]);

  const getInitials = (name: string) => {
    if (name.startsWith('+')) return '#';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <LineStatusBanner />
        {/* Screen Header */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <ThemedText type="title" style={styles.title}>
              Call Logs
            </ThemedText>
            <View style={styles.headerRightRow}>
              <SpringPressable
                scaleTo={0.92}
                onPress={() => setIsSimulateModalOpen(true)}
                style={[
                  styles.testCallBtn,
                  {
                    backgroundColor: theme.primary + '16',
                    borderColor: theme.primary + '35',
                  },
                ]}>
                <AppIcon name="phone" size={13} color={theme.primary} />
                <ThemedText style={[styles.testCallText, { color: theme.primary }]}>
                  Test Call
                </ThemedText>
              </SpringPressable>

              <View
                style={[
                  styles.callCountPill,
                  { backgroundColor: theme.backgroundElement },
                ]}>
                <View
                  style={[
                    styles.liveIndicator,
                    { backgroundColor: theme.callGreen },
                  ]}
                />
                <ThemedText type="smallBold" themeColor="textSecondary">
                  {filteredCalls.length} calls
                </ThemedText>
              </View>
            </View>
          </View>

          {/* Segmented Filter: All vs Missed vs Outgoing */}
          <View
            style={[
              styles.segmentContainer,
              { backgroundColor: theme.backgroundElement },
            ]}>
            <SpringPressable
              scaleTo={0.96}
              onPress={() => setFilter('all')}
              style={[
                styles.segmentButton,
                filter === 'all' && {
                  backgroundColor: theme.card,
                  ...styles.activeSegmentShadow,
                },
              ]}>
              <ThemedText
                type="smallBold"
                style={{
                  color: filter === 'all' ? theme.text : theme.textSecondary,
                  fontWeight: filter === 'all' ? '700' : '500',
                }}>
                All Calls
              </ThemedText>
            </SpringPressable>

            <SpringPressable
              scaleTo={0.96}
              onPress={() => setFilter('missed')}
              style={[
                styles.segmentButton,
                filter === 'missed' && {
                  backgroundColor: theme.card,
                  ...styles.activeSegmentShadow,
                },
              ]}>
              <ThemedText
                type="smallBold"
                style={{
                  color: filter === 'missed' ? theme.callRed : theme.textSecondary,
                  fontWeight: filter === 'missed' ? '700' : '500',
                }}>
                Missed
              </ThemedText>
            </SpringPressable>

            <SpringPressable
              scaleTo={0.96}
              onPress={() => setFilter('outgoing')}
              style={[
                styles.segmentButton,
                filter === 'outgoing' && {
                  backgroundColor: theme.card,
                  ...styles.activeSegmentShadow,
                },
              ]}>
              <ThemedText
                type="smallBold"
                style={{
                  color: filter === 'outgoing' ? theme.primary : theme.textSecondary,
                  fontWeight: filter === 'outgoing' ? '700' : '500',
                }}>
                Outgoing
              </ThemedText>
            </SpringPressable>
          </View>

          {/* Search Bar */}
          <View
            style={[
              styles.searchBar,
              {
                backgroundColor: theme.backgroundElement,
                borderColor: isSearchFocused ? theme.primary : theme.border,
              },
            ]}>
            <AppIcon
              name="search"
              size={18}
              color={isSearchFocused ? theme.primary : theme.textSecondary}
            />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              placeholder="Search call logs & numbers..."
              placeholderTextColor={theme.textSecondary}
              style={[styles.searchInput, { color: theme.text }]}
            />
            {searchQuery.length > 0 && (
              <SpringPressable onPress={() => setSearchQuery('')} hitSlop={8}>
                <AppIcon name="close" size={16} color={theme.textSecondary} />
              </SpringPressable>
            )}
          </View>
        </View>

        {/* Call Logs List with Staggered Entrance Animations */}
        <FlatList
          data={filteredCalls}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => {
            const showSection =
              index === 0 || filteredCalls[index - 1].section !== item.section;

            const isMissed = item.type === 'missed';
            const iconName =
              item.type === 'missed'
                ? 'phone-missed'
                : item.type === 'incoming'
                ? 'phone-incoming'
                : 'phone-outgoing';

            const statusColor =
              item.type === 'missed'
                ? theme.callRed
                : item.type === 'incoming'
                ? theme.callGreen
                : theme.primary;

            return (
              <Animated.View
                entering={FadeInDown.delay(index * 35).springify()}>
                {showSection && (
                  <View style={styles.sectionHeaderRow}>
                    <ThemedText
                      type="smallBold"
                      style={styles.sectionHeader}
                      themeColor="textSecondary">
                      {item.section}
                    </ThemedText>
                    <View
                      style={[
                        styles.sectionLine,
                        { backgroundColor: theme.border },
                      ]}
                    />
                  </View>
                )}

                <SpringPressable
                  scaleTo={0.98}
                  onPress={() => setSelectedCall(item)}
                  style={[
                    styles.callRow,
                    {
                      backgroundColor: theme.card,
                      borderColor: theme.border,
                    },
                  ]}>
                  {/* Avatar with Status Badge */}
                  <View style={styles.avatarWrapper}>
                    <View
                      style={[
                        styles.avatar,
                        {
                          backgroundColor: item.avatarColor + '20',
                          borderColor: item.avatarColor + '40',
                        },
                      ]}>
                      <ThemedText
                        type="smallBold"
                        style={[styles.avatarText, { color: item.avatarColor }]}>
                        {getInitials(item.name)}
                      </ThemedText>
                    </View>
                    <View
                      style={[
                        styles.typeBadge,
                        {
                          backgroundColor: statusColor,
                        },
                      ]}>
                      <AppIcon name={iconName} size={10} color="#FFFFFF" />
                    </View>
                  </View>

                  {/* Call Details */}
                  <View style={styles.callDetails}>
                    <ThemedText
                      type="default"
                      style={[
                        styles.callerName,
                        isMissed && { color: theme.callRed },
                      ]}>
                      {item.name}
                    </ThemedText>

                    <View style={styles.callSubInfo}>
                      <ThemedText type="small" themeColor="textSecondary">
                        {item.label} • {item.time}
                        {item.duration ? ` • ${item.duration}` : ''}
                      </ThemedText>
                    </View>
                  </View>

                  {/* Call Action Button */}
                  <SpringPressable
                    scaleTo={0.9}
                    onPress={() => {
                      startCall({
                        name: item.name,
                        number: item.number,
                        label: item.label,
                        avatarColor: item.avatarColor,
                      });
                    }}
                    style={[
                      styles.callActionButton,
                      {
                        backgroundColor: theme.callGreen + '16',
                        borderColor: theme.callGreen + '30',
                      },
                    ]}>
                    <AppIcon name="phone" size={17} color={theme.callGreen} />
                  </SpringPressable>
                </SpringPressable>
              </Animated.View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View
                style={[
                  styles.emptyIconCircle,
                  { backgroundColor: theme.backgroundElement },
                ]}>
                <AppIcon name="phone" size={36} color={theme.textSecondary} />
              </View>
              <ThemedText type="subtitle" style={styles.emptyTitle}>
                No Call Logs
              </ThemedText>
              <ThemedText
                type="small"
                themeColor="textSecondary"
                style={styles.emptySubtitle}>
                {filter === 'missed'
                  ? 'You have zero missed calls. You are completely caught up!'
                  : 'Your calls will show up here as soon as you place or receive a call.'}
              </ThemedText>
            </View>
          }
        />

        {/* Floating Keypad Button */}
        <FloatingKeypadButton />

        {/* Call Details Modal */}
        <CallDetailsModal
          call={selectedCall}
          visible={!!selectedCall}
          onClose={() => setSelectedCall(null)}
          onDeleteCall={deleteCallRecord}
        />

        {/* Closed-App / Background Call Simulator Modal */}
        <SimulateCallModal
          visible={isSimulateModalOpen}
          onClose={() => setIsSimulateModalOpen(false)}
        />
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
  header: {
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
    gap: Spacing.two,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  testCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  testCallText: {
    fontSize: 12,
    fontWeight: '700',
  },
  clearBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  callCountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveIndicator: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  segmentContainer: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 3,
    marginTop: 2,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    height: 44,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: Spacing.two,
    marginTop: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
    outlineWidth: 0,
  } as any,
  listContent: {
    paddingBottom: 84,
    paddingTop: Spacing.one,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: Spacing.three,
    marginBottom: Spacing.two,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  sectionLine: {
    flex: 1,
    height: 1,
    opacity: 0.6,
  },
  callRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
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
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)',
      },
    }),
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: Spacing.three,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '700',
  },
  typeBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  callDetails: {
    flex: 1,
    justifyContent: 'center',
    gap: 3,
  },
  callerName: {
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: -0.2,
  },
  callSubInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  callActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    marginLeft: Spacing.two,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.six,
    gap: Spacing.two,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  emptySubtitle: {
    textAlign: 'center',
    maxWidth: 290,
    fontSize: 14,
    lineHeight: 20,
  },
});
