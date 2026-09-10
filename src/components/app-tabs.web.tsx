import {
    TabList,
    TabListProps,
    Tabs,
    TabSlot,
    TabTrigger,
    TabTriggerSlotProps,
} from 'expo-router/ui';
import { Pressable, StyleSheet, useColorScheme, View } from 'react-native';

import { AppIcon, IconName } from '@/components/ui/app-icon';
import { Colors, MaxContentWidth, Spacing } from '@/constants/theme';
import { ThemedText } from './themed-text';

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="index" href="/" asChild>
            <TabButton icon="phone">Call Logs</TabButton>
          </TabTrigger>
          <TabTrigger name="contacts" href="/contacts" asChild>
            <TabButton icon="contacts">Contacts</TabButton>
          </TabTrigger>
          <TabTrigger name="profile" href="/profile" asChild>
            <TabButton icon="profile">Profile</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

export function TabButton({
  children,
  isFocused,
  icon,
  ...props
}: TabTriggerSlotProps & { icon?: IconName }) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  return (
    <Pressable
      {...props}
      style={({ pressed }) => [styles.tabPressable, pressed && styles.pressed]}>
      <View style={styles.tabButtonView}>
        {icon && (
          <View
            style={[
              styles.iconBadge,
              isFocused && { backgroundColor: colors.primary + '18' },
            ]}>
            <AppIcon
              name={icon}
              size={22}
              color={isFocused ? colors.primary : colors.textSecondary}
            />
          </View>
        )}
        <ThemedText
          type="small"
          style={[
            styles.tabLabel,
            {
              color: isFocused ? colors.primary : colors.textSecondary,
              fontWeight: isFocused ? '700' : '500',
            },
          ]}>
          {children}
        </ThemedText>
      </View>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  return (
    <View
      {...props}
      style={[
        styles.tabListContainer,
        {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
        },
      ]}>
      <View style={styles.innerContainer}>{props.children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    borderTopWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    zIndex: 100,
    boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.04)',
  },
  innerContainer: {
    width: '100%',
    maxWidth: MaxContentWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: 64,
    paddingHorizontal: Spacing.two,
  },
  tabPressable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  tabButtonView: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 2,
  },
  iconBadge: {
    paddingHorizontal: Spacing.three,
    paddingVertical: 3,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 11,
    letterSpacing: 0.2,
  },
  pressed: {
    opacity: 0.7,
  },
});
