import { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  StyleSheet,
  TextInput,
  View
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Contact } from '@/components/contacts/contact-details-modal';
import { ThemedText } from '@/components/themed-text';
import { AppIcon } from '@/components/ui/app-icon';
import { SpringPressable } from '@/components/ui/spring-pressable';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { appStorage } from '@/utils/storage';

interface InCallContactsSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function InCallContactsSheet({ visible, onClose }: InCallContactsSheetProps) {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const contacts = useMemo(() => {
    return appStorage.getJSON<Contact[]>('ilubilu_contacts', []);
  }, [visible]);

  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return contacts;
    const q = searchQuery.toLowerCase();
    return contacts.filter(
      (c) => c.name.toLowerCase().includes(q) || c.phone.includes(q)
    );
  }, [contacts, searchQuery]);

  const handleCopy = (id: string, text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const getInitials = (name: string) => {
    if (!name) return '#';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
            {/* Top Drag Handle */}
            <View style={styles.dragBar}>
              <View style={styles.dragPill} />
            </View>

            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <View style={styles.activeCallBadge}>
                  <View style={styles.pulsingDot} />
                  <ThemedText style={styles.activeCallText}>CALL ACTIVE</ThemedText>
                </View>
                <ThemedText type="subtitle" style={styles.title}>
                  Contacts Lookup
                </ThemedText>
              </View>
              <SpringPressable
                onPress={onClose}
                hitSlop={12}
                style={styles.closeBtn}>
                <AppIcon name="close" size={20} color="#FFFFFF" />
              </SpringPressable>
            </View>

            {/* Search Input */}
            <View style={styles.searchBar}>
              <AppIcon name="search" size={18} color="rgba(255, 255, 255, 0.5)" />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search name or phone number..."
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                style={styles.searchInput}
              />
              {searchQuery.length > 0 && (
                <SpringPressable onPress={() => setSearchQuery('')} hitSlop={8}>
                  <AppIcon name="close" size={16} color="rgba(255, 255, 255, 0.5)" />
                </SpringPressable>
              )}
            </View>

            {/* Contacts List */}
            <FlatList
              data={filteredContacts}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              renderItem={({ item, index }) => {
                const isCopied = copiedId === item.id;
                return (
                  <Animated.View
                    entering={FadeInDown.delay(index * 20).springify()}
                    style={styles.contactCard}>
                    <View
                      style={[
                        styles.avatar,
                        {
                          backgroundColor: item.avatarColor + '25',
                          borderColor: item.avatarColor + '50',
                        },
                      ]}>
                      <ThemedText
                        type="smallBold"
                        style={{ color: item.avatarColor, fontSize: 14 }}>
                        {getInitials(item.name)}
                      </ThemedText>
                    </View>

                    <View style={styles.infoCol}>
                      <ThemedText style={styles.nameText}>
                        {item.name}
                      </ThemedText>
                      <ThemedText style={styles.phoneText}>
                        {item.label} • {item.phone}
                      </ThemedText>
                    </View>

                    <SpringPressable
                      scaleTo={0.9}
                      onPress={() => handleCopy(item.id, item.phone)}
                      style={[
                        styles.copyBtn,
                        isCopied && { backgroundColor: theme.callGreen + '25', borderColor: theme.callGreen },
                      ]}>
                      <AppIcon
                        name={isCopied ? 'check' : 'copy'}
                        size={14}
                        color={isCopied ? theme.callGreen : '#FFFFFF'}
                      />
                      <ThemedText
                        style={[
                          styles.copyBtnText,
                          isCopied && { color: theme.callGreen },
                        ]}>
                        {isCopied ? 'Copied' : 'Copy'}
                      </ThemedText>
                    </SpringPressable>
                  </Animated.View>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyWrap}>
                  <ThemedText style={styles.emptyText}>
                    No contacts matched your search query.
                  </ThemedText>
                </View>
              }
            />
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    maxHeight: '85%',
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  safeArea: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
  },
  dragBar: {
    alignItems: 'center',
    paddingTop: Spacing.two,
    paddingBottom: Spacing.one,
  },
  dragPill: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  headerLeft: {
    gap: 4,
  },
  activeCallBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignSelf: 'flex-start',
  },
  pulsingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  activeCallText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 14,
    paddingHorizontal: Spacing.three,
    height: 42,
    gap: Spacing.two,
    marginTop: Spacing.two,
    marginBottom: Spacing.three,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    paddingVertical: 0,
    outlineWidth: 0,
  } as any,
  listContent: {
    gap: 10,
    paddingBottom: Spacing.four,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCol: {
    flex: 1,
    gap: 2,
  },
  nameText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  phoneText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  copyBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyWrap: {
    paddingVertical: Spacing.six,
    alignItems: 'center',
  },
  emptyText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
  },
});

