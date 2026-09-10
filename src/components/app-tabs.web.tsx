import {
    TabList,
    TabListProps,
    Tabs,
    TabSlot,
    TabTrigger,
    TabTriggerSlotProps,
} from 'expo-router/ui';
import { StyleSheet, View } from 'react-native';

import { AppIcon, IconName } from '@/components/ui/app-icon';
import { SpringPressable } from '@/components/ui/spring-pressable';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
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
  const theme = useTheme();

  return (
    <SpringPressable
      scaleTo={0.93}
      {...props}
      style={styles.tabPressable}>
      <View style={styles.tabButtonView}>
        {icon && (
          <View
            style={[
              styles.iconBadge,
              isFocused && {
                backgroundColor: theme.primary + '20',
                borderWidth: 1,
                borderColor: theme.primary + '35',
              },
            ]}>
            <AppIcon
              name={icon}
              size={22}
              color={isFocused ? theme.primary : theme.textSecondary}
            />
          </View>
        )}
        <ThemedText
          type="small"
          style={[
            styles.tabLabel,
            {
              color: isFocused ? theme.primary : theme.textSecondary,
              fontWeight: isFocused ? '700' : '500',
            },
          ]}>
          {children}
        </ThemedText>
      </View>
    </SpringPressable>
  );
}

export function CustomTabList(props: TabListProps) {
  const theme = useTheme();

  return (
    <View
      {...props}
      style={[
        styles.tabListContainer,
        {
          backgroundColor: theme.card,
          borderTopColor: theme.border,
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
    boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.05)',
  },
  innerContainer: {
    width: '100%',
    maxWidth: MaxContentWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: 64,
    paddingHorizontal: Spacing.three,
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
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 11,
    letterSpacing: 0.2,
  },
});
