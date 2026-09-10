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
import { ThemedView } from './themed-view';

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
    <Pressable {...props} style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView
        style={[
          styles.tabButtonView,
          isFocused
            ? { backgroundColor: colors.backgroundSelected }
            : { backgroundColor: 'transparent' },
        ]}>
        {icon && (
          <AppIcon
            name={icon}
            size={18}
            color={isFocused ? colors.primary : colors.textSecondary}
          />
        )}
        <ThemedText
          type="smallBold"
          style={{
            color: isFocused ? colors.primary : colors.textSecondary,
          }}>
          {children}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  return (
    <View {...props} style={styles.tabListContainer}>
      <ThemedView
        style={[
          styles.innerContainer,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}>
        {props.children}
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    padding: Spacing.three,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  innerContainer: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderWidth: 1,
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.12)',
  },
  pressed: {
    opacity: 0.7,
  },
  tabButtonView: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: 20,
  },
});
