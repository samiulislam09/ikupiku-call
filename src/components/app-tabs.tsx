import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  return (
    <NativeTabs
      backgroundColor={colors.card}
      indicatorColor={colors.backgroundElement}
      disableTransparentOnScrollEdge={true}
      shadowColor={colors.border}
      labelStyle={{ selected: { color: colors.primary } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Call Logs</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="phone.fill" md="call" />
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
