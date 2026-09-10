import {
    TabList,
    TabListProps,
    Tabs,
    TabSlot,
    TabTrigger,
    TabTriggerSlotProps,
} from 'expo-router/ui';
import { Platform, StyleSheet, View } from 'react-native';

import { AppIcon, IconName } from '@/components/ui/app-icon';
import { SpringPressable } from '@/components/ui/spring-pressable';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useThemeContext } from '@/context/theme-context';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from './themed-text';

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="index" href="/" asChild>
            <TabButton icon="phone" badge={2}>
              Call Logs
            </TabButton>
          </TabTrigger>
          <TabTrigger name="contacts" href="/contacts" asChild>
            <TabButton icon="contacts">
              Contacts
            </TabButton>
          </TabTrigger>
          <TabTrigger name="profile" href="/profile" asChild>
            <TabButton icon="profile" showOnlineDot>
              Profile
            </TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

interface TabButtonProps extends TabTriggerSlotProps {
  icon?: IconName;
  badge?: number | string;
  showOnlineDot?: boolean;
}

export function TabButton({
  children,
  isFocused,
  icon,
  badge,
  showOnlineDot,
  ...props
}: TabButtonProps) {
  const theme = useTheme();
  const { isDark } = useThemeContext();

  return (
    <SpringPressable
      scaleTo={0.93}
      {...props}
      style={styles.tabPressable}>
      <View
        style={[
          styles.tabCapsule,
          isFocused && {
            backgroundColor: isDark
              ? 'rgba(99, 102, 241, 0.14)'
              : 'rgba(79, 70, 229, 0.08)',
            borderColor: isDark
              ? 'rgba(99, 102, 241, 0.32)'
              : 'rgba(79, 70, 229, 0.22)',
            ...styles.activeCapsuleGlow,
          },
        ]}>
        {/* Icon with micro-badge */}
        <View style={styles.iconContainer}>
          {icon && (
            <View
              style={[
                styles.iconGlowWrap,
                isFocused && {
                  backgroundColor: isDark
                    ? 'rgba(99, 102, 241, 0.25)'
                    : 'rgba(79, 70, 229, 0.14)',
                },
              ]}>
              <AppIcon
                name={icon}
                size={20}
                color={isFocused ? theme.primary : theme.textSecondary}
              />
            </View>
          )}

          {/* Missed Call or Notification Badge */}
          {badge !== undefined && (
            <View
              style={[
                styles.pillBadge,
                {
                  backgroundColor: theme.callRed,
                  borderColor: isDark ? '#0B0F19' : '#FFFFFF',
                },
              ]}>
              <ThemedText style={styles.pillBadgeText}>
                {badge}
              </ThemedText>
            </View>
          )}

          {/* Online VoIP Status Dot */}
          {showOnlineDot && (
            <View
              style={[
                styles.onlineDot,
                {
                  backgroundColor: theme.callGreen,
                  borderColor: isDark ? '#0B0F19' : '#FFFFFF',
                },
              ]}
            />
          )}
        </View>

        {/* Tab Title Label */}
        <ThemedText
          type="small"
          style={[
            styles.tabLabel,
            {
              color: isFocused ? theme.primary : theme.textSecondary,
              fontWeight: isFocused ? '700' : '500',
              opacity: isFocused ? 1 : 0.85,
            },
          ]}>
          {children}
        </ThemedText>

        {/* Neon Indicator Dash */}
        <View
          style={[
            styles.indicatorDash,
            isFocused && {
              backgroundColor: theme.primary,
              opacity: 1,
              ...Platform.select({
                web: {
                  boxShadow: isDark
                    ? '0 0 10px rgba(99, 102, 241, 0.9), 0 0 3px #6366F1'
                    : '0 0 8px rgba(79, 70, 229, 0.65)',
                },
                default: {
                  shadowColor: theme.primary,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.8,
                  shadowRadius: 6,
                },
              }),
            },
          ]}
        />
      </View>
    </SpringPressable>
  );
}

export function CustomTabList(props: TabListProps) {
  const { isDark } = useThemeContext();

  return (
    <View
      {...props}
      style={[
        styles.tabListContainer,
        {
          backgroundColor: isDark
            ? 'rgba(11, 15, 25, 0.90)'
            : 'rgba(255, 255, 255, 0.92)',
          borderTopColor: isDark
            ? 'rgba(255, 255, 255, 0.08)'
            : 'rgba(0, 0, 0, 0.07)',
          ...Platform.select({
            web: {
              boxShadow: isDark
                ? '0 -8px 32px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.07)'
                : '0 -8px 32px rgba(15, 23, 42, 0.07), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
            },
          }),
        },
      ]}>
      {/* Top Ambient Sheen Line */}
      <View
        style={[
          styles.topSheenLine,
          {
            backgroundColor: isDark
              ? 'rgba(255, 255, 255, 0.06)'
              : 'rgba(255, 255, 255, 0.85)',
          },
        ]}
      />

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
    ...Platform.select({
      web: {
        backdropFilter: 'blur(24px) saturate(190%)',
        WebkitBackdropFilter: 'blur(24px) saturate(190%)',
      } as any,
    }),
  },
  topSheenLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    zIndex: 101,
  },
  innerContainer: {
    width: '100%',
    maxWidth: MaxContentWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: 66,
    paddingHorizontal: Spacing.four,
  },
  tabPressable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    paddingVertical: 4,
    maxWidth: 160,
  },
  tabCapsule: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingTop: 5,
    paddingBottom: 4,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'transparent',
    minWidth: 92,
    gap: 2,
    position: 'relative',
  },
  activeCapsuleGlow: {
    ...Platform.select({
      ios: {
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 12px rgba(99, 102, 241, 0.15)',
      },
    }),
  },
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconGlowWrap: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillBadge: {
    position: 'absolute',
    top: -3,
    right: -7,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 6px rgba(244, 63, 94, 0.45)',
      },
    }),
  },
  pillBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    lineHeight: 11,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    ...Platform.select({
      web: {
        boxShadow: '0 0 6px rgba(16, 185, 129, 0.6)',
      },
    }),
  },
  tabLabel: {
    fontSize: 11,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  indicatorDash: {
    width: 18,
    height: 2.5,
    borderRadius: 1.5,
    backgroundColor: 'transparent',
    opacity: 0,
    marginTop: 1,
  },
});
