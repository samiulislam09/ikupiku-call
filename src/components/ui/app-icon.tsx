import type { AndroidSymbol, SFSymbol } from 'expo-symbols';
import { SymbolView } from 'expo-symbols';
import { StyleProp, ViewStyle } from 'react-native';

export type IconName =
  | 'phone'
  | 'phone-incoming'
  | 'phone-outgoing'
  | 'phone-missed'
  | 'contacts'
  | 'profile'
  | 'dialpad'
  | 'backspace'
  | 'close'
  | 'search'
  | 'star'
  | 'mic'
  | 'volume'
  | 'moon'
  | 'sun'
  | 'palette';

interface AppIconProps {
  name: IconName;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

const ICON_MAP: Record<IconName, { ios: SFSymbol; android: AndroidSymbol; web: AndroidSymbol }> = {
  phone: {
    ios: 'phone.fill',
    android: 'call',
    web: 'call',
  },
  'phone-incoming': {
    ios: 'phone.arrow.down.left.fill',
    android: 'call_received',
    web: 'call_received',
  },
  'phone-outgoing': {
    ios: 'phone.arrow.up.right.fill',
    android: 'call_made',
    web: 'call_made',
  },
  'phone-missed': {
    ios: 'phone.down.fill',
    android: 'call_missed',
    web: 'call_missed',
  },
  contacts: {
    ios: 'person.2.fill',
    android: 'contacts',
    web: 'contacts',
  },
  profile: {
    ios: 'person.crop.circle.fill',
    android: 'person',
    web: 'person',
  },
  dialpad: {
    ios: 'circle.grid.3x3.fill',
    android: 'dialpad',
    web: 'dialpad',
  },
  backspace: {
    ios: 'delete.backward.fill',
    android: 'backspace',
    web: 'backspace',
  },
  close: {
    ios: 'chevron.down',
    android: 'close',
    web: 'close',
  },
  search: {
    ios: 'magnifyingglass',
    android: 'search',
    web: 'search',
  },
  star: {
    ios: 'star.fill',
    android: 'star',
    web: 'star',
  },
  mic: {
    ios: 'mic.fill',
    android: 'mic',
    web: 'mic',
  },
  volume: {
    ios: 'speaker.wave.2.fill',
    android: 'volume_up',
    web: 'volume_up',
  },
  moon: {
    ios: 'moon.fill',
    android: 'dark_mode',
    web: 'dark_mode',
  },
  sun: {
    ios: 'sun.max.fill',
    android: 'light_mode',
    web: 'light_mode',
  },
  palette: {
    ios: 'paintpalette.fill',
    android: 'palette',
    web: 'palette',
  },
};

export function AppIcon({ name, size = 24, color, style }: AppIconProps) {
  const iconConfig = ICON_MAP[name];

  if (!iconConfig) {
    return null;
  }

  return (
    <SymbolView
      size={size}
      tintColor={color}
      style={style}
      name={{
        ios: iconConfig.ios,
        android: iconConfig.android,
        web: iconConfig.web,
      }}
    />
  );
}
