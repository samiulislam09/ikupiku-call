import React, { useEffect, useRef, useState } from 'react';
import {
    Image,
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
import { useUserProfile } from '@/context/user-profile-context';
import { useSwipeDownToDismiss } from '@/hooks/use-swipe-down-to-dismiss';
import { useTheme } from '@/hooks/use-theme';

export const PRESET_AVATARS = [
  {
    id: 'p1',
    label: 'Alex',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
  },
  {
    id: 'p2',
    label: 'David',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
  },
  {
    id: 'p3',
    label: 'Sarah',
    url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&auto=format&fit=crop&q=80',
  },
  {
    id: 'p4',
    label: 'Marcus',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
  },
  {
    id: 'p5',
    label: 'Elena',
    url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&auto=format&fit=crop&q=80',
  },
  {
    id: 'p6',
    label: 'Sam',
    url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=300&auto=format&fit=crop&q=80',
  },
];

export const AVATAR_COLORS = [
  '#6366F1', // Indigo
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#F43F5E', // Rose
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#EC4899', // Pink
];

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
}

export function EditProfileModal({ visible, onClose }: EditProfileModalProps) {
  const theme = useTheme();
  const { profile, updateProfile } = useUserProfile();

  const [name, setName] = useState(profile.name);
  const [phone, setPhone] = useState(profile.phone);
  const [photoUri, setPhotoUri] = useState<string | undefined>(profile.photoUri);
  const [avatarColor, setAvatarColor] = useState(profile.avatarColor);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync state when modal opens
  useEffect(() => {
    if (visible) {
      setName(profile.name);
      setPhone(profile.phone);
      setPhotoUri(profile.photoUri);
      setAvatarColor(profile.avatarColor);
    }
  }, [visible, profile]);

  const handleSave = () => {
    updateProfile({
      name: name.trim() || 'Alex Morgan',
      phone: phone.trim() || '+1 (555) 019-2831',
      photoUri,
      avatarColor,
    });
    onClose();
  };

  const handleFileUploadClick = () => {
    if (Platform.OS === 'web' && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result;
        if (typeof result === 'string') {
          setPhotoUri(result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const getInitials = (n: string) => {
    if (!n) return 'ME';
    const parts = n.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
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
    onClose,
    visible,
  });

  if (!visible) return null;

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
                styles.headerBar,
                Platform.select({
                  web: {
                    touchAction: 'none',
                  } as any,
                }),
              ]}>
              <SpringPressable
                scaleTo={0.92}
                onPress={dismissModal}
                style={[styles.headerButton, { backgroundColor: theme.backgroundElement }]}>
                <ThemedText style={{ color: theme.textSecondary, fontWeight: '600' }}>
                  Cancel
                </ThemedText>
              </SpringPressable>

              <ThemedText type="smallBold" style={styles.headerTitle}>
                Edit Profile
              </ThemedText>

              <SpringPressable
                scaleTo={0.92}
                onPress={handleSave}
                style={[styles.saveButton, { backgroundColor: theme.primary }]}>
                <ThemedText style={styles.saveButtonText}>
                  Save
                </ThemedText>
              </SpringPressable>
            </View>

            <ScrollView
              onScroll={onScroll}
              scrollEventThrottle={16}
              bounces={false}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}>
            {/* Live Profile Picture Preview & Change Section */}
            <Animated.View
              entering={FadeInDown.duration(260).springify()}
              style={styles.avatarSection}>
              <View style={styles.avatarWrap}>
                <View
                  style={[
                    styles.avatarAura,
                    { backgroundColor: (avatarColor || theme.primary) + '25' },
                  ]}
                />
                <View
                  style={[
                    styles.avatarCircle,
                    { backgroundColor: avatarColor || theme.primary },
                  ]}>
                  {photoUri ? (
                    <Image
                      source={{ uri: photoUri }}
                      style={styles.avatarImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <ThemedText style={styles.initialsText}>
                      {getInitials(name)}
                    </ThemedText>
                  )}
                </View>

                {/* Camera Badge Icon */}
                <SpringPressable
                  scaleTo={0.88}
                  onPress={handleFileUploadClick}
                  style={[styles.cameraBadge, { backgroundColor: theme.primary }]}>
                  <AppIcon name="camera" size={15} color="#FFFFFF" />
                </SpringPressable>
              </View>

              {/* Web Hidden File Input */}
              {Platform.OS === 'web' && (
                <input
                  ref={fileInputRef as any}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
              )}

              {/* Photo Action Buttons */}
              <View style={styles.photoActionsRow}>
                <SpringPressable
                  scaleTo={0.94}
                  onPress={handleFileUploadClick}
                  style={[
                    styles.photoActionButton,
                    { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                  ]}>
                  <AppIcon name="camera" size={15} color={theme.primary} />
                  <ThemedText type="smallBold" style={{ color: theme.primary }}>
                    Upload Photo
                  </ThemedText>
                </SpringPressable>

                {photoUri && (
                  <SpringPressable
                    scaleTo={0.94}
                    onPress={() => setPhotoUri(undefined)}
                    style={[
                      styles.photoActionButton,
                      { backgroundColor: theme.callRed + '14', borderColor: theme.callRed + '30' },
                    ]}>
                    <AppIcon name="close" size={15} color={theme.callRed} />
                    <ThemedText type="smallBold" style={{ color: theme.callRed }}>
                      Use Initials
                    </ThemedText>
                  </SpringPressable>
                )}
              </View>
            </Animated.View>

            {/* Choose from Preset Photos */}
            <View style={styles.sectionBlock}>
              <ThemedText type="smallBold" style={styles.sectionLabel} themeColor="textSecondary">
                CHOOSE PRESET AVATAR
              </ThemedText>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.presetsList}>
                {PRESET_AVATARS.map((preset) => {
                  const isSelected = photoUri === preset.url;
                  return (
                    <SpringPressable
                      key={preset.id}
                      scaleTo={0.9}
                      onPress={() => setPhotoUri(preset.url)}
                      style={[
                        styles.presetCircle,
                        isSelected && { borderColor: theme.primary, borderWidth: 3 },
                      ]}>
                      <Image source={{ uri: preset.url }} style={styles.presetImage} />
                      {isSelected && (
                        <View style={[styles.presetSelectedBadge, { backgroundColor: theme.primary }]}>
                          <AppIcon name="check" size={10} color="#FFFFFF" />
                        </View>
                      )}
                    </SpringPressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Initials Color Palette (When photo not used) */}
            <View style={styles.sectionBlock}>
              <ThemedText type="smallBold" style={styles.sectionLabel} themeColor="textSecondary">
                ACCENT & INITIALS COLOR
              </ThemedText>
              <View style={styles.colorsGrid}>
                {AVATAR_COLORS.map((color) => {
                  const isSelected = avatarColor === color;
                  return (
                    <SpringPressable
                      key={color}
                      scaleTo={0.88}
                      onPress={() => setAvatarColor(color)}
                      style={[
                        styles.colorDot,
                        { backgroundColor: color },
                        isSelected && styles.colorDotSelected,
                      ]}>
                      {isSelected && (
                        <AppIcon name="check" size={14} color="#FFFFFF" />
                      )}
                    </SpringPressable>
                  );
                })}
              </View>
            </View>

            {/* Profile Info Form Inputs */}
            <View style={styles.sectionBlock}>
              <ThemedText type="smallBold" style={styles.sectionLabel} themeColor="textSecondary">
                PERSONAL DETAILS
              </ThemedText>

              <View
                style={[
                  styles.formCard,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}>
                {/* Full Name */}
                <View style={styles.fieldGroup}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Full Name
                  </ThemedText>
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="Your Full Name"
                    placeholderTextColor={theme.textSecondary}
                    style={[styles.input, { color: theme.text }]}
                  />
                </View>

                <View style={[styles.divider, { backgroundColor: theme.border }]} />

                {/* Phone Number */}
                <View style={styles.fieldGroup}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Phone Number
                  </ThemedText>
                  <TextInput
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="+1 (555) 000-0000"
                    placeholderTextColor={theme.textSecondary}
                    keyboardType="phone-pad"
                    style={[styles.input, { color: theme.text }]}
                  />
                </View>
              </View>
            </View>
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
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150, 150, 150, 0.15)',
  },
  headerButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  headerTitle: {
    fontSize: 16,
    letterSpacing: -0.2,
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 14,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    gap: Spacing.four,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
    gap: Spacing.three,
  },
  avatarWrap: {
    position: 'relative',
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarAura: {
    position: 'absolute',
    width: 112,
    height: 112,
    borderRadius: 56,
  },
  avatarCircle: {
    width: 92,
    height: 92,
    borderRadius: 46,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  initialsText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
  },
  cameraBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  photoActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  photoActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
  },
  sectionBlock: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 1,
    paddingHorizontal: Spacing.one,
  },
  presetsList: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 4,
  },
  presetCircle: {
    position: 'relative',
    width: 54,
    height: 54,
    borderRadius: 27,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(150, 150, 150, 0.2)',
  },
  presetImage: {
    width: '100%',
    height: '100%',
  },
  presetSelectedBadge: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingVertical: 4,
  },
  colorDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorDotSelected: {
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    transform: [{ scale: 1.1 }],
  },
  formCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    padding: Spacing.three,
    gap: Spacing.two,
  },
  fieldGroup: {
    gap: 4,
  },
  input: {
    fontSize: 16,
    fontWeight: '600',
    paddingVertical: 4,
    outlineWidth: 0,
  } as any,
  divider: {
    height: 1,
    marginVertical: 4,
  },
});

