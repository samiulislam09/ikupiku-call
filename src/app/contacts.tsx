import { useMemo, useState } from 'react';
import {
    FlatList,
    Image,
    Platform,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ContactDetailsModal, type Contact } from '@/components/contacts/contact-details-modal';
import { FloatingKeypadButton } from '@/components/keypad/floating-keypad-button';
import { EditProfileModal } from '@/components/profile/edit-profile-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppIcon } from '@/components/ui/app-icon';
import { SpringPressable } from '@/components/ui/spring-pressable';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useCall } from '@/context/call-context';
import { useUserProfile } from '@/context/user-profile-context';
import { useTheme } from '@/hooks/use-theme';
import { appStorage } from '@/utils/storage';

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
    avatarColor: '#F43F5E',
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
  const { startCall } = useCall();
  const { profile } = useUserProfile();
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Persisted contacts state in localStorage
  const [contacts, setContacts] = useState<Contact[]>(() =>
    appStorage.getJSON('ilubilu_contacts', MOCK_CONTACTS)
  );
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  const handleSaveContact = (updated: Contact) => {
    setContacts((prev) => {
      const exists = prev.some((c) => c.id === updated.id);
      const next = exists
        ? prev.map((c) => (c.id === updated.id ? updated : c))
        : [updated, ...prev];
      appStorage.setJSON('ilubilu_contacts', next);
      return next;
    });
    setSelectedContact(updated);
  };

  const handleDeleteContact = (id: string) => {
    setContacts((prev) => {
      const next = prev.filter((c) => c.id !== id);
      appStorage.setJSON('ilubilu_contacts', next);
      return next;
    });
    setSelectedContact(null);
  };

  const handleAddNewContact = () => {
    const newContact: Contact = {
      id: 'c_' + Date.now(),
      name: '',
      phone: '+1 ',
      label: 'Mobile',
      avatarColor: '#4F46E5',
      isFavorite: false,
    };
    setSelectedContact(newContact);
  };

  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return contacts;
    const q = searchQuery.toLowerCase();
    return contacts.filter(
      (c) => c.name.toLowerCase().includes(q) || c.phone.includes(q)
    );
  }, [contacts, searchQuery]);

  const favorites = useMemo(
    () => contacts.filter((c) => c.isFavorite),
    [contacts]
  );

  const getInitials = (name: string) => {
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
            <View style={styles.headerRightActions}>
              <View
                style={[
                  styles.badge,
                  { backgroundColor: theme.backgroundElement },
                ]}>
                <ThemedText type="smallBold" themeColor="primary">
                  {contacts.length} contacts
                </ThemedText>
              </View>
              <SpringPressable
                scaleTo={0.92}
                onPress={handleAddNewContact}
                style={[
                  styles.addContactButton,
                  { backgroundColor: theme.primary },
                ]}>
                <ThemedText style={styles.addContactButtonText}>+ New</ThemedText>
              </SpringPressable>
            </View>
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
              placeholder="Search contacts by name or number..."
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

        {/* Contacts List with Staggered Entrance Animations */}
        <FlatList
          data={filteredContacts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            searchQuery.length === 0 ? (
              <View style={styles.headerExtras}>
                {/* My Card Profile Row */}
                <SpringPressable
                  scaleTo={0.98}
                  onPress={() => setIsEditProfileOpen(true)}
                  style={[
                    styles.myCardRow,
                    {
                      backgroundColor: theme.card,
                      borderColor: theme.border,
                    },
                  ]}>
                  <View
                    style={[
                      styles.myCardAvatar,
                      {
                        backgroundColor: profile.avatarColor || theme.primary,
                        borderColor: 'rgba(255, 255, 255, 0.25)',
                      },
                    ]}>
                    {profile.photoUri ? (
                      <Image
                        source={{ uri: profile.photoUri }}
                        style={styles.myCardAvatarImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <ThemedText type="smallBold" style={{ color: '#FFFFFF', fontSize: 16 }}>
                        {getInitials(profile.name)}
                      </ThemedText>
                    )}
                    <View
                      style={[
                        styles.myCardOnlineDot,
                        { backgroundColor: theme.callGreen },
                      ]}
                    />
                  </View>
                  <View style={styles.myCardInfo}>
                    <View style={styles.nameBadgeRow}>
                      <ThemedText type="default" style={styles.contactName}>
                        {profile.name} (You)
                      </ThemedText>
                      <View
                        style={[
                          styles.activeLinePill,
                          { backgroundColor: theme.callGreen + '18' },
                        ]}>
                        <ThemedText
                          type="smallBold"
                          style={{ color: theme.callGreen, fontSize: 10 }}>
                          VoIP LINE 1
                        </ThemedText>
                      </View>
                    </View>
                    <ThemedText type="small" themeColor="textSecondary">
                      {profile.phone} • HD Voice
                    </ThemedText>
                  </View>
                </SpringPressable>

                {/* Favorites Horizontal Scroll with Glow Rings */}
                <View style={styles.favoritesSection}>
                  <View style={styles.favoritesHeader}>
                    <AppIcon name="star" size={15} color="#F59E0B" />
                    <ThemedText
                      type="smallBold"
                      style={styles.sectionTitle}
                      themeColor="textSecondary">
                      FAVORITE CONTACTS
                    </ThemedText>
                  </View>

                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.favoritesScrollContent}>
                    {favorites.map((fav) => (
                      <SpringPressable
                        key={fav.id}
                        scaleTo={0.92}
                        onPress={() => setSelectedContact(fav)}
                        style={styles.favCard}>
                        <View
                          style={[
                            styles.favAvatarRing,
                            { borderColor: fav.avatarColor + '60' },
                          ]}>
                          <View
                            style={[
                              styles.favAvatar,
                              { backgroundColor: fav.avatarColor + '25' },
                            ]}>
                            <ThemedText
                              type="smallBold"
                              style={{ color: fav.avatarColor, fontSize: 15 }}>
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
                        </View>
                        <ThemedText
                          type="small"
                          numberOfLines={1}
                          style={[styles.favName, { color: theme.text }]}>
                          {fav.name.split(' ')[0]}
                        </ThemedText>
                      </SpringPressable>
                    ))}
                  </ScrollView>
                </View>

                <View style={styles.allContactsHeaderRow}>
                  <ThemedText
                    type="smallBold"
                    style={styles.sectionTitle}
                    themeColor="textSecondary">
                    ALL CONTACTS
                  </ThemedText>
                  <View
                    style={[
                      styles.sectionLine,
                      { backgroundColor: theme.border },
                    ]}
                  />
                </View>
              </View>
            ) : null
          }
          renderItem={({ item, index }) => {
            const firstLetter = item.name[0].toUpperCase();
            const prevFirstLetter =
              index > 0 ? filteredContacts[index - 1].name[0].toUpperCase() : '';
            const showLetter = firstLetter !== prevFirstLetter;

            return (
              <Animated.View
                entering={FadeInDown.delay(index * 25).springify()}>
                {showLetter && (
                  <ThemedText
                    type="smallBold"
                    style={styles.letterHeader}
                    themeColor="primary">
                    {firstLetter}
                  </ThemedText>
                )}

                <SpringPressable
                  scaleTo={0.98}
                  onPress={() => setSelectedContact(item)}
                  style={[
                    styles.contactRow,
                    {
                      backgroundColor: theme.card,
                      borderColor: theme.border,
                    },
                  ]}>
                  {/* Contact Avatar */}
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

                  {/* Contact Info */}
                  <View style={styles.contactDetails}>
                    <ThemedText type="default" style={styles.contactName}>
                      {item.name}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {item.label} • {item.phone}
                    </ThemedText>
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.actionRow}>
                    <SpringPressable
                      scaleTo={0.9}
                      onPress={() => {
                        startCall({
                          name: item.name,
                          number: item.phone,
                          label: item.label,
                          avatarColor: item.avatarColor,
                        });
                      }}
                      style={[
                        styles.actionButton,
                        {
                          backgroundColor: theme.callGreen + '16',
                          borderColor: theme.callGreen + '30',
                        },
                      ]}>
                      <AppIcon name="phone" size={16} color={theme.callGreen} />
                    </SpringPressable>
                  </View>
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
                <AppIcon name="contacts" size={36} color={theme.textSecondary} />
              </View>
              <ThemedText type="subtitle" style={styles.emptyTitle}>
                No Contacts Found
              </ThemedText>
              <ThemedText
                type="small"
                themeColor="textSecondary"
                style={styles.emptySubtitle}>
                No contacts match your query. Try searching another name or number.
              </ThemedText>
            </View>
          }
        />

        {/* Contact Details & Edit Modal */}
        <ContactDetailsModal
          visible={!!selectedContact}
          contact={selectedContact}
          onClose={() => setSelectedContact(null)}
          onSaveContact={handleSaveContact}
          onDeleteContact={handleDeleteContact}
        />

        {/* Edit My Profile Modal */}
        <EditProfileModal
          visible={isEditProfileOpen}
          onClose={() => setIsEditProfileOpen(false)}
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
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addContactButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  addContactButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
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
  headerExtras: {
    marginBottom: Spacing.two,
  },
  myCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: Spacing.three,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04)',
      },
    }),
  },
  myCardAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.three,
    position: 'relative',
    borderWidth: 2,
    overflow: 'hidden',
  },
  myCardAvatarImage: {
    width: '100%',
    height: '100%',
  },
  myCardOnlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 13,
    height: 13,
    borderRadius: 6.5,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  myCardInfo: {
    flex: 1,
    gap: 3,
  },
  nameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activeLinePill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
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
    gap: 14,
    paddingVertical: Spacing.one,
    paddingHorizontal: 2,
  },
  favCard: {
    alignItems: 'center',
    width: 66,
    gap: 5,
  },
  favAvatarRing: {
    padding: 2.5,
    borderRadius: 30,
    borderWidth: 1.5,
  },
  favAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  favCallBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 17,
    height: 17,
    borderRadius: 8.5,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  favName: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  allContactsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: Spacing.two,
    marginBottom: Spacing.two,
  },
  sectionTitle: {
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
  letterHeader: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: Spacing.three,
    marginBottom: Spacing.one,
    paddingHorizontal: Spacing.one,
  },
  contactRow: {
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
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.three,
    borderWidth: 1.5,
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '700',
  },
  contactDetails: {
    flex: 1,
    gap: 2,
  },
  contactName: {
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: -0.2,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
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
