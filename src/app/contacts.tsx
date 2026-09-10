import { useMemo, useState } from 'react';
import {
    FlatList,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FloatingKeypadButton } from '@/components/keypad/floating-keypad-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppIcon } from '@/components/ui/app-icon';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface Contact {
  id: string;
  name: string;
  phone: string;
  label: string;
  avatarColor: string;
  isFavorite?: boolean;
}

const MOCK_CONTACTS: Contact[] = [
  {
    id: 'c1',
    name: 'Alice Bennett',
    phone: '+1 (555) 123-4567',
    label: 'Mobile',
    avatarColor: '#6366F1',
    isFavorite: true,
  },
  {
    id: 'c2',
    name: 'Arthur Pendelton',
    phone: '+1 (555) 234-5678',
    label: 'Work',
    avatarColor: '#3B82F6',
  },
  {
    id: 'c3',
    name: 'Brian Cox',
    phone: '+1 (555) 345-6789',
    label: 'Mobile',
    avatarColor: '#10B981',
    isFavorite: true,
  },
  {
    id: 'c4',
    name: 'Charlotte Moore',
    phone: '+1 (555) 456-7890',
    label: 'Home',
    avatarColor: '#F59E0B',
  },
  {
    id: 'c5',
    name: 'David Miller',
    phone: '+1 (555) 567-8901',
    label: 'Mobile',
    avatarColor: '#EC4899',
    isFavorite: true,
  },
  {
    id: 'c6',
    name: 'Elena Rostova',
    phone: '+1 (555) 678-9012',
    label: 'Mobile',
    avatarColor: '#8B5CF6',
    isFavorite: true,
  },
  {
    id: 'c7',
    name: 'Grace Hopper',
    phone: '+1 (555) 789-0123',
    label: 'Work',
    avatarColor: '#06B6D4',
  },
  {
    id: 'c8',
    name: 'Hannah Abbott',
    phone: '+1 (555) 890-1234',
    label: 'Mobile',
    avatarColor: '#14B8A6',
  },
  {
    id: 'c9',
    name: 'Lucas Scott',
    phone: '+1 (555) 901-2345',
    label: 'Mobile',
    avatarColor: '#F43F5E',
  },
  {
    id: 'c10',
    name: 'Marcus Vance',
    phone: '+1 (555) 012-3456',
    label: 'Work',
    avatarColor: '#EAB308',
  },
  {
    id: 'c11',
    name: 'Olivia Martinez',
    phone: '+1 (555) 123-7890',
    label: 'Mobile',
    avatarColor: '#3B82F6',
  },
  {
    id: 'c12',
    name: 'Sarah Jenkins',
    phone: '+1 (555) 234-8901',
    label: 'Mobile',
    avatarColor: '#EF4444',
    isFavorite: true,
  },
  {
    id: 'c13',
    name: 'Zachary Taylor',
    phone: '+1 (555) 345-9012',
    label: 'Mobile',
    avatarColor: '#84CC16',
  },
];

export default function ContactsScreen() {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return MOCK_CONTACTS;
    const q = searchQuery.toLowerCase();
    return MOCK_CONTACTS.filter(
      (c) => c.name.toLowerCase().includes(q) || c.phone.includes(q)
    );
  }, [searchQuery]);

  const favorites = useMemo(
    () => MOCK_CONTACTS.filter((c) => c.isFavorite),
    []
  );

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <ThemedText type="title" style={styles.title}>
              Contacts
            </ThemedText>
            <View
              style={[
                styles.badge,
                { backgroundColor: theme.backgroundElement },
              ]}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                {MOCK_CONTACTS.length}
              </ThemedText>
            </View>
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
              placeholder="Search contacts by name or number..."
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

        {/* Contacts List */}
        <FlatList
          data={filteredContacts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            searchQuery.length === 0 ? (
              <View style={styles.headerExtras}>
                {/* My Card Profile Row */}
                <Pressable
                  style={({ pressed }) => [
                    styles.myCardRow,
                    {
                      backgroundColor: theme.card,
                      borderColor: theme.border,
                    },
                    pressed && styles.pressed,
                  ]}>
                  <View
                    style={[
                      styles.myCardAvatar,
                      { backgroundColor: theme.primary },
                    ]}>
                    <ThemedText type="smallBold" style={{ color: '#FFFFFF' }}>
                      ME
                    </ThemedText>
                  </View>
                  <View style={styles.myCardInfo}>
                    <ThemedText type="default" style={styles.contactName}>
                      Alex Morgan (You)
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      My Card • +1 (555) 019-2831
                    </ThemedText>
                  </View>
                </Pressable>

                {/* Favorites Horizontal Scroll */}
                <View style={styles.favoritesSection}>
                  <View style={styles.favoritesHeader}>
                    <AppIcon name="star" size={16} color="#F59E0B" />
                    <ThemedText
                      type="smallBold"
                      style={styles.sectionTitle}
                      themeColor="textSecondary">
                      FAVORITES
                    </ThemedText>
                  </View>

                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.favoritesScrollContent}>
                    {favorites.map((fav) => (
                      <Pressable
                        key={fav.id}
                        style={({ pressed }) => [
                          styles.favCard,
                          pressed && styles.pressed,
                        ]}>
                        <View
                          style={[
                            styles.favAvatar,
                            { backgroundColor: fav.avatarColor + '25' },
                          ]}>
                          <ThemedText
                            type="smallBold"
                            style={{ color: fav.avatarColor }}>
                            {getInitials(fav.name)}
                          </ThemedText>
                          <View
                            style={[
                              styles.favCallBadge,
                              { backgroundColor: theme.callGreen },
                            ]}>
                            <AppIcon name="phone" size={9} color="#FFFFFF" />
                          </View>
                        </View>
                        <ThemedText
                          type="small"
                          numberOfLines={1}
                          style={styles.favName}>
                          {fav.name.split(' ')[0]}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>

                <ThemedText
                  type="smallBold"
                  style={styles.sectionTitle}
                  themeColor="textSecondary">
                  ALL CONTACTS
                </ThemedText>
              </View>
            ) : null
          }
          renderItem={({ item, index }) => {
            const firstLetter = item.name[0].toUpperCase();
            const prevFirstLetter =
              index > 0 ? filteredContacts[index - 1].name[0].toUpperCase() : '';
            const showLetter = firstLetter !== prevFirstLetter;

            return (
              <View>
                {showLetter && (
                  <ThemedText
                    type="smallBold"
                    style={styles.letterHeader}
                    themeColor="primary">
                    {firstLetter}
                  </ThemedText>
                )}

                <Pressable
                  style={({ pressed }) => [
                    styles.contactRow,
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

                  {/* Contact Info */}
                  <View style={styles.contactDetails}>
                    <ThemedText type="default" style={styles.contactName}>
                      {item.name}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {item.label} • {item.phone}
                    </ThemedText>
                  </View>

                  {/* Quick Call Action */}
                  <Pressable
                    onPress={() => {
                      // Call action placeholder
                    }}
                    style={({ pressed }) => [
                      styles.actionButton,
                      { backgroundColor: theme.backgroundElement },
                      pressed && styles.pressed,
                    ]}>
                    <AppIcon name="phone" size={17} color={theme.callGreen} />
                  </Pressable>
                </Pressable>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <AppIcon name="contacts" size={44} color={theme.textSecondary} />
              <ThemedText type="subtitle" style={styles.emptyTitle}>
                No Contacts Found
              </ThemedText>
              <ThemedText
                type="small"
                themeColor="textSecondary"
                style={styles.emptySubtitle}>
                No contacts matched your search query.
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
  },
  header: {
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
    gap: Spacing.two,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
  },
  badge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: 12,
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
    paddingBottom: 84,
    paddingTop: Spacing.one,
  },
  headerExtras: {
    marginBottom: Spacing.two,
  },
  myCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: Spacing.three,
  },
  myCardAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.three,
  },
  myCardInfo: {
    flex: 1,
    gap: 2,
  },
  favoritesSection: {
    marginBottom: Spacing.three,
  },
  favoritesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.two,
  },
  favoritesScrollContent: {
    gap: Spacing.three,
    paddingVertical: Spacing.one,
  },
  favCard: {
    alignItems: 'center',
    width: 64,
    gap: 4,
  },
  favAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  favCallBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  favName: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  letterHeader: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: Spacing.three,
    marginBottom: Spacing.one,
    paddingHorizontal: Spacing.one,
  },
  contactRow: {
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
  contactDetails: {
    flex: 1,
    gap: 2,
  },
  contactName: {
    fontWeight: '600',
    fontSize: 16,
  },
  actionButton: {
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

