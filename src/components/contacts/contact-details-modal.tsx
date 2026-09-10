import React, { useState } from 'react';
import {
    Modal,
    Platform,
    Pressable,
    Animated as RNAnimated,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { AppIcon } from '@/components/ui/app-icon';
import { SpringPressable } from '@/components/ui/spring-pressable';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useCall } from '@/context/call-context';
import { useSwipeDownToDismiss } from '@/hooks/use-swipe-down-to-dismiss';
import { useTheme } from '@/hooks/use-theme';

export interface Contact {
  id: string;
  name: string;
  phone: string;
  label: string;
  avatarColor: string;
  email?: string;
  isFavorite?: boolean;
}

const AVATAR_COLORS = [
  '#4F46E5', // Indigo
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#F43F5E', // Rose
  '#8B5CF6', // Violet
  '#06B6D4', // Cyan
  '#EC4899', // Pink
];

const LABEL_OPTIONS = ['Mobile', 'Work', 'Home', 'Main'];

interface ContactDetailsModalProps {
  contact: Contact | null;
  visible: boolean;
  onClose: () => void;
  onSaveContact: (updated: Contact) => void;
  onDeleteContact?: (id: string) => void;
}

export function ContactDetailsModal({
  contact,
  visible,
  onClose,
  onSaveContact,
  onDeleteContact,
}: ContactDetailsModalProps) {
  const theme = useTheme();
  const { startCall } = useCall();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [label, setLabel] = useState('Mobile');
  const [email, setEmail] = useState('');
  const [avatarColor, setAvatarColor] = useState('#4F46E5');
  const [isFavorite, setIsFavorite] = useState(false);
  const [copied, setCopied] = useState(false);

  // Synchronize edit fields when a contact is selected
  React.useEffect(() => {
    if (contact) {
      setName(contact.name);
      setPhone(contact.phone);
      setLabel(contact.label || 'Mobile');
      setEmail(contact.email || '');
      setAvatarColor(contact.avatarColor || '#4F46E5');
      setIsFavorite(contact.isFavorite ?? false);
      setIsEditing(false);
      setCopied(false);
    }
  }, [contact]);

  const handleDismiss = () => {
    if (isEditing) {
      setIsEditing(false);
    }
    onClose();
  };

  const {
    grabberPanHandlers,
    containerTouchHandlers,
    onScroll,
    animatedStyle,
    backdropOpacity,
    isDragging,
    dismissModal,
  } = useSwipeDownToDismiss({
    onClose: handleDismiss,
    visible,
  });

  if (!contact) return null;

  const getInitials = (n: string) => {
    if (!n) return '#';
    const parts = n.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
  };

  const handleSave = () => {
    if (!name.trim()) return;
    const updated: Contact = {
      ...contact,
      name: name.trim(),
      phone: phone.trim() || contact.phone,
      label,
      email: email.trim() || undefined,
      avatarColor,
      isFavorite,
    };
    onSaveContact(updated);
    setIsEditing(false);
  };

  const handleCall = () => {
    onClose();
    startCall({
      name: contact.name,
      number: contact.phone,
      label: contact.label,
      avatarColor: contact.avatarColor,
    });
  };

  const copyNumber = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent={true}
      onRequestClose={dismissModal}>
      <View style={styles.modalOverlay}>
        <RNAnimated.View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: 'rgba(0, 0, 0, 0.45)',
              opacity: backdropOpacity,
            },
          ]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={dismissModal} />
        </RNAnimated.View>

        <RNAnimated.View
          {...containerTouchHandlers}
          style={[
            styles.container,
            { backgroundColor: theme.background },
            animatedStyle,
            Platform.select({
              web: {
                userSelect: 'none',
              } as any,
            }),
          ]}>
          <SafeAreaView
            edges={Platform.OS === 'ios' ? ['left', 'right', 'bottom'] : ['top', 'left', 'right', 'bottom']}
            style={styles.safeArea}>
            {/* Top Drag Handle Bar */}
            <View
              {...grabberPanHandlers}
              style={[
                styles.dragBar,
                Platform.select({
                  web: {
                    touchAction: 'none',
                    cursor: isDragging ? 'grabbing' : 'grab',
                  } as any,
                }),
              ]}>
              <View
                style={[
                  styles.dragPill,
                  {
                    backgroundColor: theme.border,
                    width: isDragging ? 54 : 36,
                  },
                ]}
              />
            </View>

            {/* Header Bar */}
            <View
              {...grabberPanHandlers}
              style={[
                styles.header,
                Platform.select({
                  web: {
                    touchAction: 'none',
                  } as any,
                }),
              ]}>
              <SpringPressable
                scaleTo={0.92}
                onPress={() => {
                  if (isEditing) {
                    setIsEditing(false);
                  } else {
                    dismissModal();
                  }
                }}
                style={[
                  styles.headerButton,
                  { backgroundColor: theme.backgroundElement },
                ]}>
                <AppIcon
                  name={isEditing ? 'close' : 'back'}
                  size={20}
                  color={theme.text}
                />
              </SpringPressable>

              <ThemedText type="subtitle" style={styles.headerTitle}>
                {isEditing ? 'Edit Contact' : 'Contact Details'}
              </ThemedText>

              {isEditing ? (
                <SpringPressable
                scaleTo={0.92}
                onPress={handleSave}
                style={[
                  styles.saveButton,
                  { backgroundColor: theme.primary },
                ]}>
                <ThemedText style={styles.saveButtonText}>Save</ThemedText>
              </SpringPressable>
            ) : (
              <SpringPressable
                scaleTo={0.92}
                onPress={() => setIsEditing(true)}
                style={[
                  styles.headerButton,
                  { backgroundColor: theme.backgroundElement },
                ]}>
                <ThemedText type="smallBold" style={{ color: theme.primary }}>
                  Edit
                </ThemedText>
              </SpringPressable>
            )}
          </View>

          <ScrollView
            onScroll={onScroll}
            scrollEventThrottle={16}
            bounces={false}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}>
            {isEditing ? (
              /* ================== EDIT MODE ================== */
              <Animated.View entering={FadeInDown.duration(200)} style={styles.editSection}>
                {/* Avatar Preview & Color Palette */}
                <View style={styles.editAvatarSection}>
                  <View
                    style={[
                      styles.avatarPreview,
                      {
                        backgroundColor: avatarColor + '25',
                        borderColor: avatarColor,
                      },
                    ]}>
                    <ThemedText
                      type="title"
                      style={[styles.avatarText, { color: avatarColor }]}>
                      {getInitials(name || contact.name)}
                    </ThemedText>
                  </View>

                  <ThemedText type="small" themeColor="textSecondary">
                    Choose Accent Color
                  </ThemedText>

                  <View style={styles.colorRow}>
                    {AVATAR_COLORS.map((c) => (
                      <SpringPressable
                        key={c}
                        scaleTo={0.88}
                        onPress={() => setAvatarColor(c)}
                        style={[
                          styles.colorDot,
                          { backgroundColor: c },
                          avatarColor === c && styles.colorDotSelected,
                        ]}>
                        {avatarColor === c ? (
                          <AppIcon name="check" size={14} color="#FFFFFF" />
                        ) : null}
                      </SpringPressable>
                    ))}
                  </View>
                </View>

                {/* Form Fields Card */}
                <View
                  style={[
                    styles.groupCard,
                    { backgroundColor: theme.card, borderColor: theme.border },
                  ]}>
                  {/* Full Name */}
                  <View style={styles.inputGroup}>
                    <ThemedText type="smallBold" themeColor="textSecondary">
                      FULL NAME
                    </ThemedText>
                    <TextInput
                      value={name}
                      onChangeText={setName}
                      placeholder="Contact Name"
                      placeholderTextColor={theme.textSecondary}
                      style={[
                        styles.input,
                        {
                          backgroundColor: theme.backgroundElement,
                          color: theme.text,
                          borderColor: theme.border,
                        },
                      ]}
                    />
                  </View>

                  <View style={[styles.divider, { backgroundColor: theme.border }]} />

                  {/* Phone Number */}
                  <View style={styles.inputGroup}>
                    <ThemedText type="smallBold" themeColor="textSecondary">
                      PHONE NUMBER
                    </ThemedText>
                    <TextInput
                      value={phone}
                      onChangeText={setPhone}
                      keyboardType="phone-pad"
                      placeholder="+1 (555) 000-0000"
                      placeholderTextColor={theme.textSecondary}
                      style={[
                        styles.input,
                        {
                          backgroundColor: theme.backgroundElement,
                          color: theme.text,
                          borderColor: theme.border,
                        },
                      ]}
                    />
                  </View>

                  <View style={[styles.divider, { backgroundColor: theme.border }]} />

                  {/* Label Selection */}
                  <View style={styles.inputGroup}>
                    <ThemedText type="smallBold" themeColor="textSecondary">
                      PHONE LABEL
                    </ThemedText>
                    <View style={styles.labelsRow}>
                      {LABEL_OPTIONS.map((l) => (
                        <SpringPressable
                          key={l}
                          scaleTo={0.94}
                          onPress={() => setLabel(l)}
                          style={[
                            styles.labelChip,
                            {
                              backgroundColor:
                                label === l
                                  ? theme.primary
                                  : theme.backgroundElement,
                              borderColor:
                                label === l ? theme.primary : theme.border,
                            },
                          ]}>
                          <ThemedText
                            type="smallBold"
                            style={{
                              color: label === l ? '#FFFFFF' : theme.textSecondary,
                              fontSize: 12,
                            }}>
                            {l}
                          </ThemedText>
                        </SpringPressable>
                      ))}
                    </View>
                  </View>

                  <View style={[styles.divider, { backgroundColor: theme.border }]} />

                  {/* Email */}
                  <View style={styles.inputGroup}>
                    <ThemedText type="smallBold" themeColor="textSecondary">
                      EMAIL ADDRESS
                    </ThemedText>
                    <TextInput
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      placeholder="user@example.com (optional)"
                      placeholderTextColor={theme.textSecondary}
                      style={[
                        styles.input,
                        {
                          backgroundColor: theme.backgroundElement,
                          color: theme.text,
                          borderColor: theme.border,
                        },
                      ]}
                    />
                  </View>

                  <View style={[styles.divider, { backgroundColor: theme.border }]} />

                  {/* Favorite Toggle */}
                  <SpringPressable
                    scaleTo={0.98}
                    onPress={() => setIsFavorite((v) => !v)}
                    style={styles.favoriteToggleRow}>
                    <View style={styles.favoriteLeft}>
                      <AppIcon
                        name="star"
                        size={20}
                        color={isFavorite ? '#F59E0B' : theme.textSecondary}
                      />
                      <ThemedText type="default">
                        Add to Favorites
                      </ThemedText>
                    </View>
                    <View
                      style={[
                        styles.checkbox,
                        {
                          backgroundColor: isFavorite
                            ? theme.primary
                            : theme.backgroundElement,
                          borderColor: isFavorite ? theme.primary : theme.border,
                        },
                      ]}>
                      {isFavorite && (
                        <ThemedText style={{ color: '#FFFFFF', fontSize: 12 }}>
                          ✓
                        </ThemedText>
                      )}
                    </View>
                  </SpringPressable>
                </View>

                {/* Delete Contact Button */}
                {onDeleteContact && (
                  <SpringPressable
                    scaleTo={0.96}
                    onPress={() => {
                      onDeleteContact(contact.id);
                      dismissModal();
                    }}
                    style={[
                      styles.deleteButton,
                      { backgroundColor: theme.callRed + '14', borderColor: theme.callRed + '30' },
                    ]}>
                    <AppIcon name="block" size={18} color={theme.callRed} />
                    <ThemedText style={[styles.deleteButtonText, { color: theme.callRed }]}>
                      Delete Contact
                    </ThemedText>
                  </SpringPressable>
                )}
              </Animated.View>
            ) : (
              /* ================== VIEW MODE ================== */
              <Animated.View entering={FadeInDown.springify()}>
                {/* Hero Avatar Card */}
                <View
                  style={[
                    styles.heroCard,
                    { backgroundColor: theme.card, borderColor: theme.border },
                  ]}>
                  <View
                    style={[
                      styles.avatarLarge,
                      {
                        backgroundColor: (contact.avatarColor || theme.primary) + '22',
                        borderColor: (contact.avatarColor || theme.primary) + '50',
                      },
                    ]}>
                    <ThemedText
                      type="title"
                      style={[
                        styles.avatarLargeText,
                        { color: contact.avatarColor || theme.primary },
                      ]}>
                      {getInitials(contact.name)}
                    </ThemedText>
                  </View>

                  <ThemedText type="title" style={styles.contactTitle}>
                    {contact.name}
                  </ThemedText>

                  <ThemedText type="default" themeColor="textSecondary">
                    {contact.label} • {contact.phone}
                  </ThemedText>

                  {/* Primary Quick Actions */}
                  <View style={styles.quickActionsRow}>
                    <View style={styles.quickActionItem}>
                      <SpringPressable
                        scaleTo={0.9}
                        onPress={handleCall}
                        style={[
                          styles.actionCircle,
                          { backgroundColor: theme.callGreen },
                        ]}>
                        <AppIcon name="phone" size={24} color="#FFFFFF" />
                      </SpringPressable>
                      <ThemedText type="smallBold" style={styles.actionLabel}>
                        Call
                      </ThemedText>
                    </View>

                    <View style={styles.quickActionItem}>
                      <SpringPressable
                        scaleTo={0.9}
                        onPress={() => {}}
                        style={[
                          styles.actionCircle,
                          { backgroundColor: theme.backgroundElement },
                        ]}>
                        <AppIcon name="message" size={22} color={theme.text} />
                      </SpringPressable>
                      <ThemedText type="smallBold" style={styles.actionLabel}>
                        Message
                      </ThemedText>
                    </View>

                    <View style={styles.quickActionItem}>
                      <SpringPressable
                        scaleTo={0.9}
                        onPress={() => {
                          const updated = { ...contact, isFavorite: !contact.isFavorite };
                          onSaveContact(updated);
                        }}
                        style={[
                          styles.actionCircle,
                          { backgroundColor: theme.backgroundElement },
                        ]}>
                        <AppIcon
                          name="star"
                          size={22}
                          color={contact.isFavorite ? '#F59E0B' : theme.textSecondary}
                        />
                      </SpringPressable>
                      <ThemedText type="smallBold" style={styles.actionLabel}>
                        {contact.isFavorite ? 'Favorite' : 'Fav'}
                      </ThemedText>
                    </View>
                  </View>
                </View>

                {/* Details Section */}
                <View style={styles.section}>
                  <ThemedText
                    type="smallBold"
                    style={styles.sectionTitle}
                    themeColor="textSecondary">
                    CONTACT INFORMATION
                  </ThemedText>

                  <View
                    style={[
                      styles.groupCard,
                      { backgroundColor: theme.card, borderColor: theme.border },
                    ]}>
                    {/* Phone */}
                    <SpringPressable
                      scaleTo={0.98}
                      onPress={copyNumber}
                      style={styles.detailRow}>
                      <View style={styles.detailRowLeft}>
                        <View
                          style={[
                            styles.detailIconBox,
                            { backgroundColor: theme.primary + '16' },
                          ]}>
                          <AppIcon name="phone" size={18} color={theme.primary} />
                        </View>
                        <View style={styles.detailTexts}>
                          <ThemedText type="default" style={styles.detailValue}>
                            {contact.phone}
                          </ThemedText>
                          <ThemedText type="small" themeColor="textSecondary">
                            {contact.label} • Tap to copy
                          </ThemedText>
                        </View>
                      </View>
                      <View
                        style={[
                          styles.copyBadge,
                          { backgroundColor: theme.backgroundElement },
                        ]}>
                        <AppIcon
                          name="copy"
                          size={15}
                          color={copied ? theme.callGreen : theme.textSecondary}
                        />
                        <ThemedText
                          type="small"
                          style={{
                            color: copied ? theme.callGreen : theme.textSecondary,
                            fontSize: 11,
                          }}>
                          {copied ? 'Copied' : 'Copy'}
                        </ThemedText>
                      </View>
                    </SpringPressable>

                    {/* Email if available */}
                    {contact.email && (
                      <>
                        <View style={[styles.divider, { backgroundColor: theme.border }]} />
                        <View style={styles.detailRow}>
                          <View style={styles.detailRowLeft}>
                            <View
                              style={[
                                styles.detailIconBox,
                                { backgroundColor: '#3B82F616' },
                              ]}>
                              <AppIcon name="message" size={18} color="#3B82F6" />
                            </View>
                            <View style={styles.detailTexts}>
                              <ThemedText type="default" style={styles.detailValue}>
                                {contact.email}
                              </ThemedText>
                              <ThemedText type="small" themeColor="textSecondary">
                                Email
                              </ThemedText>
                            </View>
                          </View>
                        </View>
                      </>
                    )}
                  </View>
                </View>

                {/* Edit Contact Prompt Card */}
                <View style={styles.section}>
                  <SpringPressable
                    scaleTo={0.97}
                    onPress={() => setIsEditing(true)}
                    style={[
                      styles.editTriggerCard,
                      { backgroundColor: theme.card, borderColor: theme.primary + '35' },
                    ]}>
                    <View style={styles.editTriggerLeft}>
                      <View
                        style={[
                          styles.detailIconBox,
                          { backgroundColor: theme.primary + '18' },
                        ]}>
                        <AppIcon name="palette" size={18} color={theme.primary} />
                      </View>
                      <View style={styles.detailTexts}>
                        <ThemedText type="default" style={[styles.detailValue, { color: theme.primary }]}>
                          Edit Contact Details
                        </ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          Update name, phone number, label, and colors
                        </ThemedText>
                      </View>
                    </View>
                    <ThemedText type="smallBold" style={{ color: theme.primary }}>
                      Edit →
                    </ThemedText>
                  </SpringPressable>
                </View>
              </Animated.View>
            )}
          </ScrollView>
          </SafeAreaView>
        </RNAnimated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
  },
  container: {
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
    width: '100%',
  },
  dragBar: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing.two,
    paddingBottom: Spacing.one,
    width: '100%',
    minHeight: 24,
  },
  dragPill: {
    height: 5,
    borderRadius: 2.5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  headerButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  scrollContent: {
    padding: Spacing.four,
    paddingBottom: Spacing.six,
  },
  heroCard: {
    alignItems: 'center',
    padding: Spacing.five,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: Spacing.four,
  },
  avatarLarge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    marginBottom: Spacing.three,
  },
  avatarLargeText: {
    fontSize: 34,
    fontWeight: '800',
  },
  contactTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginBottom: 4,
    textAlign: 'center',
  },
  quickActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.four,
    marginTop: Spacing.four,
  },
  quickActionItem: {
    alignItems: 'center',
    gap: 6,
  },
  actionCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: 12,
    letterSpacing: 0.2,
  },
  section: {
    marginBottom: Spacing.four,
    gap: Spacing.two,
  },
  sectionTitle: {
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    paddingLeft: Spacing.two,
  },
  groupCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.three,
  },
  detailRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    flex: 1,
  },
  detailIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailTexts: {
    flex: 1,
    gap: 2,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  copyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  divider: {
    height: 1,
    marginLeft: 56,
  },
  editTriggerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.three,
    borderRadius: 18,
    borderWidth: 1.5,
  },
  editTriggerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    flex: 1,
  },
  editSection: {
    gap: Spacing.four,
  },
  editAvatarSection: {
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  avatarPreview: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
  },
  avatarText: {
    fontSize: 30,
    fontWeight: '800',
  },
  colorRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  colorDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  colorDotSelected: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
    transform: [{ scale: 1.15 }],
  },
  inputGroup: {
    padding: Spacing.three,
    gap: 8,
  },
  input: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 15,
    outlineWidth: 0,
  } as any,
  labelsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  labelChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  favoriteToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.three,
  },
  favoriteLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: Spacing.two,
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
