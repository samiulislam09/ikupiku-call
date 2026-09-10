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
  | 'palette'
  | 'video'
  | 'message'
  | 'info'
  | 'share'
  | 'block'
  | 'clock'
  | 'copy'
  | 'back'
  | 'mic-off'
  | 'phone-down'
  | 'pause'
  | 'user-plus'
  | 'waveform'
  | 'video-off'
  | 'volume-off'
  | 'check'
  | 'camera';

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
  video: {
    ios: 'video.fill',
    android: 'videocam',
    web: 'videocam',
  },
  message: {
    ios: 'message.fill',
    android: 'message',
    web: 'message',
  },
  info: {
    ios: 'info.circle.fill',
    android: 'info',
    web: 'info',
  },
  share: {
    ios: 'square.and.arrow.up',
    android: 'share',
    web: 'share',
  },
  block: {
    ios: 'nosign',
    android: 'block',
    web: 'block',
  },
  clock: {
    ios: 'clock.fill',
    android: 'schedule',
    web: 'schedule',
  },
  copy: {
    ios: 'doc.on.doc.fill',
    android: 'content_copy',
    web: 'content_copy',
  },
  back: {
    ios: 'chevron.left',
    android: 'arrow_back',
    web: 'arrow_back',
  },
  'mic-off': {
    ios: 'mic.slash.fill',
    android: 'mic_off',
    web: 'mic_off',
  },
  'phone-down': {
    ios: 'phone.down.fill',
    android: 'call_end',
    web: 'call_end',
  },
  pause: {
    ios: 'pause.fill',
    android: 'pause',
    web: 'pause',
  },
  'user-plus': {
    ios: 'person.crop.circle.badge.plus',
    android: 'person_add',
    web: 'person_add',
  },
  waveform: {
    ios: 'waveform',
    android: 'graphic_eq',
    web: 'graphic_eq',
  },
  'video-off': {
    ios: 'video.slash.fill',
    android: 'videocam_off',
    web: 'videocam_off',
  },
  'volume-off': {
    ios: 'speaker.slash.fill',
    android: 'volume_off',
    web: 'volume_off',
  },
  check: {
    ios: 'checkmark',
    android: 'check',
    web: 'check',
  },
  camera: {
    ios: 'camera.fill',
    android: 'photo_camera',
    web: 'photo_camera',
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
