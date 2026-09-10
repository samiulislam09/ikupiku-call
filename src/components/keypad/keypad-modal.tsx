import { useMemo, useState } from 'react';
import {
    Modal,
    Platform,
    Pressable,
    Animated as RNAnimated,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import Animated, {
    FadeIn,
    FadeInDown,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ContactDetailsModal, type Contact } from '@/components/contacts/contact-details-modal';
import { ThemedText } from '@/components/themed-text';
import { AppIcon } from '@/components/ui/app-icon';
import { SpringPressable } from '@/components/ui/spring-pressable';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useCall } from '@/context/call-context';
import { useKeypad } from '@/context/keypad-context';
import { useSwipeDownToDismiss } from '@/hooks/use-swipe-down-to-dismiss';
import { useTheme } from '@/hooks/use-theme';
import { appStorage } from '@/utils/storage';

interface KeypadKeyConfig {
  digit: string;
  letters?: string;
}

const KEYPAD_KEYS: KeypadKeyConfig[][] = [
  [
    { digit: '1', letters: '➿' },
    { digit: '2', letters: 'A B C' },
    { digit: '3', letters: 'D E F' },
  ],
  [
    { digit: '4', letters: 'G H I' },
    { digit: '5', letters: 'J K L' },
    { digit: '6', letters: 'M N O' },
  ],
  [
    { digit: '7', letters: 'P Q R S' },
    { digit: '8', letters: 'T U V' },
    { digit: '9', letters: 'W X Y Z' },
  ],
  [
    { digit: '*', letters: '' },
    { digit: '0', letters: '+' },
    { digit: '#', letters: '' },
  ],
];

const T9_MAP: Record<string, string> = {
  a: '2', b: '2', c: '2',
  d: '3', e: '3', f: '3',
  g: '4', h: '4', i: '4',
  j: '5', k: '5', l: '5',
  m: '6', n: '6', o: '6',
  p: '7', q: '7', r: '7', s: '7',
  t: '8', u: '8', v: '8',
  w: '9', x: '9', y: '9', z: '9',
};

function nameToT9(name: string): string {
  return name
    .toLowerCase()
    .split('')
    .map((char) => T9_MAP[char] || '')
    .join('');
}

function DialKey({
  item,
  onPress,
  onLongPress,
}: {
  item: KeypadKeyConfig;
  onPress: () => void;
  onLongPress?: () => void;
}) {
  const theme = useTheme();

  return (
    <SpringPressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
      scaleTo={0.91}
      style={[
        styles.keypadButton,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.border,
        },
      ]}>
      <Text style={[styles.keyDigit, { color: theme.text }]}>
        {item.digit}
      </Text>
      {item.letters ? (
        <Text style={[styles.keyLetters, { color: theme.textSecondary }]}>
          {item.letters}
        </Text>
      ) : (
        <View style={styles.letterSpacer} />
      )}
    </SpringPressable>
  );
}

export function KeypadModal() {
  const {
    isKeypadVisible,
    closeKeypad,
    dialedNumber,
    pressDigit,
    deleteDigit,
    clearNumber,
  } = useKeypad();
  const theme = useTheme();
  const { startCall } = useCall();

  const [newContactToEdit, setNewContactToEdit] = useState<Contact | null>(null);

  const cleanDigits = dialedNumber.replace(/\D/g, '');

  // T9 contact search matching both numeric digits in phone & letters in name
  const matchedContacts = useMemo(() => {
    if (!cleanDigits) return [];
    const allContacts = appStorage.getJSON<Contact[]>('ilubilu_contacts', []);
    return allContacts
      .filter((c) => {
        const phoneDigits = c.phone.replace(/\D/g, '');
        const nameT9 = nameToT9(c.name);
        return phoneDigits.includes(cleanDigits) || nameT9.includes(cleanDigits);
      })
      .slice(0, 4);
  }, [cleanDigits, isKeypadVisible]);

  const handlePlaceCall = () => {
    closeKeypad();
    startCall({
      name: dialedNumber || 'Unknown Caller',
      number: dialedNumber || '+1 (555) 000-0000',
      label: 'Mobile',
      avatarColor: theme.primary,
    });
  };

  const handleCallContact = (contact: Contact) => {
    closeKeypad();
    startCall({
      name: contact.name,
      number: contact.phone,
      label: contact.label,
      avatarColor: contact.avatarColor,
    });
  };

  const handleOpenAddContact = () => {
    const newContact: Contact = {
      id: 'c_' + Date.now(),
      name: '',
      phone: dialedNumber || '+1 ',
      label: 'Mobile',
      avatarColor: theme.primary,
      isFavorite: false,
    };
    setNewContactToEdit(newContact);
  };

  const handleSaveNewContact = (contact: Contact) => {
    const current = appStorage.getJSON<Contact[]>('ilubilu_contacts', []);
    const next = [contact, ...current.filter((c) => c.id !== contact.id)];
    appStorage.setJSON('ilubilu_contacts', next);
    setNewContactToEdit(null);
    closeKeypad();
  };

  // Format dialed number with spaces
  const formattedNumber = useMemo(() => {
    if (!dialedNumber) return '';
    const clean = dialedNumber.replace(/\s+/g, '');
    if (clean.startsWith('+')) {
      return clean.replace(/(\+\d{1,3})(\d{3})?(\d{3})?(\d+)?/, (m, p1, p2, p3, p4) => {
        return [p1, p2, p3, p4].filter(Boolean).join(' ');
      });
    }
    if (clean.length <= 3) return clean;
    if (clean.length <= 6) return `${clean.slice(0, 3)} ${clean.slice(3)}`;
    if (clean.length <= 10)
      return `${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6)}`;
    return `${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6, 10)} ${clean.slice(10)}`;
  }, [dialedNumber]);

  const {
    panHandlers,
    animatedStyle,
    backdropOpacity,
    isDragging,
    dismissModal,
  } = useSwipeDownToDismiss({
    onClose: closeKeypad,
    visible: isKeypadVisible,
  });

  return (
    <Modal
      visible={isKeypadVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={dismissModal}>
      <RNAnimated.View
        style={[
          styles.modalOverlay,
          {
            opacity: backdropOpacity,
          },
        ]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={dismissModal} />

        <RNAnimated.View
          style={[
            styles.modalBackground,
            { backgroundColor: theme.background },
            animatedStyle,
          ]}>
          <SafeAreaView
            edges={Platform.OS === 'ios' ? ['left', 'right', 'bottom'] : ['top', 'left', 'right', 'bottom']}
            style={styles.safeArea}>
            {/* Drag Handle Bar & Close */}
            <View
              {...panHandlers}
              style={[
                styles.topHandleBar,
                Platform.select({
                  web: {
                    cursor: isDragging ? 'grabbing' : 'grab',
                    userSelect: 'none',
                  } as any,
                }),
              ]}>
              <View
                style={[
                  styles.sheetDragPill,
                  {
                    backgroundColor: theme.border,
                    width: isDragging ? 56 : 42,
                  },
                ]}
              />
            </View>

            <View {...panHandlers} style={styles.headerBar}>
              <SpringPressable
                onPress={dismissModal}
                hitSlop={12}
                style={[styles.headerCircleBtn, { backgroundColor: theme.backgroundElement }]}>
                <AppIcon name="close" size={20} color={theme.text} />
              </SpringPressable>

            {dialedNumber.length > 0 ? (
              <Animated.View entering={FadeIn.duration(200)}>
                <SpringPressable
                  scaleTo={0.92}
                  onPress={handleOpenAddContact}
                  style={[
                    styles.addContactPill,
                    {
                      backgroundColor: theme.primary + '18',
                      borderColor: theme.primary + '30',
                    },
                  ]}>
                  <AppIcon name="contacts" size={14} color={theme.primary} />
                  <ThemedText type="smallBold" style={{ color: theme.primary }}>
                    Add to Contacts
                  </ThemedText>
                </SpringPressable>
              </Animated.View>
            ) : (
              <ThemedText
                type="smallBold"
                style={styles.keypadTitle}
                themeColor="textSecondary">
                KEYPAD
              </ThemedText>
            )}

            <View style={styles.headerPlaceholder} />
          </View>

          {/* Number Display Area */}
          <View style={styles.displayArea}>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.45}
              style={[
                styles.numberText,
                {
                  color: theme.text,
                },
              ]}>
              {formattedNumber || ' '}
            </Text>

            {/* Matched Contacts Bar (T9) or Quick Action Chips */}
            {matchedContacts.length > 0 ? (
              <Animated.View
                entering={FadeInDown.duration(200)}
                style={styles.suggestionsContainer}>
                <ThemedText type="smallBold" style={styles.suggestionsTitle} themeColor="textSecondary">
                  MATCHED CONTACTS ({matchedContacts.length})
                </ThemedText>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.suggestionsList}>
                  {matchedContacts.map((contact) => (
                    <SpringPressable
                      key={contact.id}
                      scaleTo={0.94}
                      onPress={() => handleCallContact(contact)}
                      style={[
                        styles.suggestionCard,
                        {
                          backgroundColor: theme.card,
                          borderColor: theme.border,
                        },
                      ]}>
                      <View
                        style={[
                          styles.miniContactAvatar,
                          {
                            backgroundColor: contact.avatarColor + '20',
                            borderColor: contact.avatarColor + '40',
                          },
                        ]}>
                        <ThemedText style={[styles.miniAvatarInitial, { color: contact.avatarColor }]}>
                          {contact.name.slice(0, 1).toUpperCase()}
                        </ThemedText>
                      </View>
                      <View style={styles.suggestionTexts}>
                        <ThemedText type="smallBold" numberOfLines={1} style={styles.suggestionName}>
                          {contact.name}
                        </ThemedText>
                        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.suggestionPhone}>
                          {contact.phone}
                        </ThemedText>
                      </View>
                      <View style={[styles.miniCallBadge, { backgroundColor: theme.callGreen + '16' }]}>
                        <AppIcon name="phone" size={13} color={theme.callGreen} />
                      </View>
                    </SpringPressable>
                  ))}
                </ScrollView>
              </Animated.View>
            ) : dialedNumber.length > 0 ? (
              <Animated.View
                entering={FadeInDown.duration(200)}
                style={styles.quickChipsRow}>
                <SpringPressable
                  onPress={handlePlaceCall}
                  style={[
                    styles.chip,
                    { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                  ]}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Audio Call
                  </ThemedText>
                </SpringPressable>

                <SpringPressable
                  onPress={handleOpenAddContact}
                  style={[
                    styles.chip,
                    { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                  ]}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Add to Contacts
                  </ThemedText>
                </SpringPressable>
              </Animated.View>
            ) : null}
          </View>

          {/* 3x4 Dialpad Grid */}
          <View style={styles.gridContainer}>
            {KEYPAD_KEYS.map((row, rowIndex) => (
              <View key={`row-${rowIndex}`} style={styles.keypadRow}>
                {row.map((item) => (
                  <DialKey
                    key={item.digit}
                    item={item}
                    onPress={() => pressDigit(item.digit)}
                    onLongPress={() => {
                      if (item.digit === '0') {
                        pressDigit('+');
                      } else if (item.digit === '1') {
                        closeKeypad();
                        startCall({
                          name: 'Voicemail',
                          number: '*86',
                          label: 'Carrier Voicemail',
                          avatarColor: '#10B981',
                        });
                      }
                    }}
                  />
                ))}
              </View>
            ))}
          </View>

          {/* Bottom Action Footer */}
          <View style={styles.bottomBar}>
            {/* Left: Close Keypad */}
            <SpringPressable
              onPress={closeKeypad}
              hitSlop={12}
              style={[
                styles.bottomSideButton,
                { backgroundColor: theme.backgroundElement },
              ]}>
              <AppIcon name="close" size={24} color={theme.textSecondary} />
            </SpringPressable>

            {/* Center: Glowing Green Call Button */}
            <SpringPressable
              scaleTo={0.92}
              onPress={handlePlaceCall}
              style={[
                styles.callButton,
                { backgroundColor: theme.callGreen },
              ]}>
              <AppIcon name="phone" size={32} color="#FFFFFF" />
            </SpringPressable>

            {/* Right: Backspace Button */}
            {dialedNumber.length > 0 ? (
              <Animated.View entering={FadeIn.duration(150)}>
                <SpringPressable
                  onPress={deleteDigit}
                  onLongPress={clearNumber}
                  delayLongPress={300}
                  hitSlop={12}
                  style={[
                    styles.bottomSideButton,
                    { backgroundColor: theme.backgroundElement },
                  ]}>
                  <AppIcon name="backspace" size={22} color={theme.text} />
                </SpringPressable>
              </Animated.View>
            ) : (
              <View style={styles.bottomSideButton} />
            )}
          </View>

          {/* Contact Edit Modal for Add to Contacts */}
          <ContactDetailsModal
            visible={!!newContactToEdit}
            contact={newContactToEdit}
            onClose={() => setNewContactToEdit(null)}
            onSaveContact={handleSaveNewContact}
          />
          </SafeAreaView>
        </RNAnimated.View>
      </RNAnimated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalBackground: {
    flex: 1,
    marginTop: Platform.OS === 'ios' ? 44 : 20,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
      },
      android: {
        elevation: 10,
      },
      web: {
        boxShadow: '0 -8px 32px rgba(0, 0, 0, 0.25)',
      },
    }),
  },
  safeArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
    width: '100%',
  },
  topHandleBar: {
    width: '100%',
    alignItems: 'center',
    paddingTop: Spacing.two,
  },
  sheetDragPill: {
    width: 42,
    height: 5,
    borderRadius: 3,
  },
  headerBar: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    minHeight: 48,
  },
  headerCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addContactPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  keypadTitle: {
    letterSpacing: 2,
    fontSize: 12,
  },
  headerPlaceholder: {
    width: 36,
  },
  displayArea: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
    gap: Spacing.one,
  },
  numberText: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -0.5,
    textAlign: 'center',
    height: 44,
  },
  quickChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  suggestionsContainer: {
    width: '100%',
    maxWidth: 340,
    marginTop: 4,
    gap: 4,
  },
  suggestionsTitle: {
    fontSize: 10,
    letterSpacing: 0.5,
    textAlign: 'left',
    paddingHorizontal: 4,
  },
  suggestionsList: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  suggestionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    minWidth: 155,
  },
  miniContactAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniAvatarInitial: {
    fontSize: 12,
    fontWeight: '700',
  },
  suggestionTexts: {
    flex: 1,
    gap: 1,
  },
  suggestionName: {
    fontSize: 12,
  },
  suggestionPhone: {
    fontSize: 10,
  },
  miniCallBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridContainer: {
    width: '100%',
    maxWidth: 340,
    gap: 16,
    paddingHorizontal: Spacing.two,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  keypadButton: {
    width: 74,
    height: 74,
    borderRadius: 37,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        cursor: 'pointer',
        userSelect: 'none',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
      },
    }),
  },
  keyDigit: {
    fontSize: 30,
    fontWeight: '600',
    lineHeight: 34,
  },
  keyLetters: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    marginTop: -1,
  },
  letterSpacer: {
    height: 10,
  },
  bottomBar: {
    width: '100%',
    maxWidth: 340,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.three,
    paddingHorizontal: Spacing.two,
  },
  bottomSideButton: {
    width: 58,
    height: 58,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 29,
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
  callButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
      },
      android: {
        elevation: 6,
      },
      web: {
        cursor: 'pointer',
        boxShadow: '0 4px 18px rgba(16, 185, 129, 0.45)',
      },
    }),
  },
});
