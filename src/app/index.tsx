import { useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FloatingKeypadButton } from '@/components/keypad/floating-keypad-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppIcon } from '@/components/ui/app-icon';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface CallRecord {
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

const MOCK_CALLS: CallRecord[] = [
  {
    id: '1',
    name: 'Sarah Jenkins',
    number: '+1 (555) 342-9812',
    type: 'missed',
    time: '11:45 AM',
    section: 'Today',
    label: 'Mobile',
    avatarColor: '#EF4444',
  },
  {
    id: '2',
    name: 'David Miller',
    number: '+1 (555) 762-1104',
    type: 'incoming',
    time: '10:15 AM',
    section: 'Today',
    label: 'Work',
    duration: '4m 32s',
    avatarColor: '#3B82F6',
  },
  {
    id: '3',
    name: '+1 (555) 902-8341',
    number: '+1 (555) 902-8341',
    type: 'outgoing',
    time: '8:20 AM',
    section: 'Today',
    label: 'Unknown',
    duration: '1m 15s',
    avatarColor: '#8B5CF6',
  },
  {
    id: '4',
    name: 'Emily Watson',
    number: '+1 (555) 619-2044',
    type: 'incoming',
    time: 'Yesterday',
    section: 'Yesterday',
    label: 'Home',
    duration: '12m 04s',
    avatarColor: '#10B981',
  },
  {
    id: '5',
    name: 'Marcus Vance',
    number: '+1 (555) 441-9032',
    type: 'missed',
    time: 'Yesterday',
    section: 'Yesterday',
    label: 'Mobile',
    avatarColor: '#EF4444',
  },
  {
    id: '6',
    name: 'Elena Rostova',
    number: '+1 (555) 883-7120',
    type: 'outgoing',
    time: 'Yesterday',
    section: 'Yesterday',
    label: 'Mobile',
    duration: '2m 45s',
    avatarColor: '#F59E0B',
  },
  {
    id: '7',
    name: 'Dr. Robert Chen',
    number: '+1 (555) 234-9081',
    type: 'incoming',
    time: 'Oct 12',
    section: 'Older',
    label: 'Clinic',
    duration: '6m 18s',
    avatarColor: '#06B6D4',
  },
  {
    id: '8',
    name: 'Olivia Martinez',
    number: '+1 (555) 489-0199',
    type: 'outgoing',
    time: 'Oct 10',
    section: 'Older',
    label: 'Mobile',
    duration: '35s',
    avatarColor: '#EC4899',
  },
];

export default function CallLogsScreen() {
  const theme = useTheme();
  const [filter, setFilter] = useState<'all' | 'missed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCalls = MOCK_CALLS.filter((call) => {
    if (filter === 'missed' && call.type !== 'missed') {
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
      <SafeAreaView style={styles.safeArea}>
        {/* Screen Header */}
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            Call Logs
          </ThemedText>

          {/* Segmented Filter: All vs Missed */}
          <View
            style={[
              styles.segmentContainer,
              { backgroundColor: theme.backgroundElement },
            ]}>
            <Pressable
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
                }}>
                All Calls
              </ThemedText>
            </Pressable>

            <Pressable
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
                }}>
                Missed
              </ThemedText>
            </Pressable>
          </View>

          {/* Search Bar */}
          <View
            style={[
              styles.searchBar,
              { backgroundColor: theme.backgroundElement, borderColor: theme.border },
            ]}>
            <AppIcon name="search" size={18} color={theme.textSecondary} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search call logs..."
              placeholderTextColor={theme.textSecondary}
              style={[styles.searchInput, { color: theme.text }]}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                <AppIcon name="close" size={16} color={theme.textSecondary} />
              </Pressable>
            )}
          </View>
        </View>

        {/* Call Logs List */}
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

            const iconColor =
              item.type === 'missed'
                ? theme.callRed
                : item.type === 'incoming'
                ? theme.callGreen
                : theme.primary;

            return (
              <View>
                {showSection && (
                  <ThemedText
                    type="smallBold"
                    style={styles.sectionHeader}
                    themeColor="textSecondary">
                    {item.section}
                  </ThemedText>
                )}

                <Pressable
                  style={({ pressed }) => [
                    styles.callRow,
                    {
                      backgroundColor: pressed
                        ? theme.backgroundSelected
                        : theme.card,
                      borderColor: theme.border,
                    },
                  ]}>
                  {/* Contact Avatar */}
                  <View
                    style={[
                      styles.avatar,
                      { backgroundColor: item.avatarColor + '20' },
                    ]}>
                    <ThemedText
                      type="smallBold"
                      style={{ color: item.avatarColor }}>
                      {getInitials(item.name)}
                    </ThemedText>
                  </View>

                  {/* Call Info */}
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
                      <AppIcon name={iconName} size={13} color={iconColor} />
                      <ThemedText type="small" themeColor="textSecondary">
                        {item.label} • {item.time}
                        {item.duration ? ` (${item.duration})` : ''}
                      </ThemedText>
                    </View>
                  </View>

                  {/* Call Action Button */}
                  <Pressable
                    onPress={() => {
                      // Call action placeholder
                    }}
                    style={({ pressed }) => [
                      styles.callActionButton,
                      { backgroundColor: theme.backgroundElement },
                      pressed && styles.pressed,
                    ]}>
                    <AppIcon name="phone" size={18} color={theme.callGreen} />
                  </Pressable>
                </Pressable>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <AppIcon name="phone" size={44} color={theme.textSecondary} />
              <ThemedText type="subtitle" style={styles.emptyTitle}>
                No Call Logs
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.emptySubtitle}>
                {filter === 'missed'
                  ? 'You do not have any missed calls.'
                  : 'Your call history will appear here once you make or receive calls.'}
              </ThemedText>
            </View>
          }
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
    paddingBottom: BottomTabInset + Spacing.three,
  },
  header: {
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
    gap: Spacing.two,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
  },
  segmentContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
    marginTop: Spacing.one,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: Spacing.one + 2,
    alignItems: 'center',
    borderRadius: 9,
  },
  activeSegmentShadow: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
    outlineWidth: 0,
  } as any,
  listContent: {
    paddingBottom: 90,
    paddingTop: Spacing.one,
  },
  sectionHeader: {
    marginTop: Spacing.three,
    marginBottom: Spacing.two,
    paddingHorizontal: Spacing.one,
    textTransform: 'uppercase',
    fontSize: 12,
    letterSpacing: 0.8,
  },
  callRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: 14,
    marginBottom: Spacing.two,
    borderWidth: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.three,
  },
  callDetails: {
    flex: 1,
    justifyContent: 'center',
    gap: 2,
  },
  callerName: {
    fontWeight: '600',
    fontSize: 16,
  },
  callSubInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  callActionButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.six,
    gap: Spacing.two,
  },
  emptyTitle: {
    fontSize: 20,
    marginTop: Spacing.two,
  },
  emptySubtitle: {
    textAlign: 'center',
    maxWidth: 280,
    fontSize: 14,
  },
});
