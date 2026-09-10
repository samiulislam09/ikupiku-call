import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { Colors } from '@/constants/theme';
import { useThemeContext } from '@/context/theme-context';

export default function AppTabs() {
  const { isDark } = useThemeContext();
  const colors = Colors[isDark ? 'dark' : 'light'];

  return (
    <NativeTabs
      backgroundColor={colors.card}
      indicatorColor={isDark ? '#6366F124' : '#4F46E518'}
      disableTransparentOnScrollEdge={true}
      shadowColor={isDark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.08)'}
      blurEffect={isDark ? 'systemMaterialDark' : 'systemMaterialLight'}
      iconColor={colors.textSecondary}
      tintColor={colors.primary}
      labelStyle={{
        selected: { color: colors.primary, fontWeight: '700' },
        default: { color: colors.textSecondary, fontWeight: '500' },
      }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Call Logs</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="phone.fill" md="call" />
        <NativeTabs.Trigger.Badge>2</NativeTabs.Trigger.Badge>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="contacts">
        <NativeTabs.Trigger.Label>Contacts</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person.2.fill" md="contacts" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person.crop.circle.fill" md="person" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
