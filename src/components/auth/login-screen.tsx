import { useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppIcon } from '@/components/ui/app-icon';
import { SpringPressable } from '@/components/ui/spring-pressable';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { ApiError } from '@/services/api';

type Mode = 'login' | 'register';

export function LoginScreen() {
  const theme = useTheme();
  const { login, register } = useAuth();

  const [mode, setMode] = useState<Mode>('login');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isRegister = mode === 'register';

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
  };

  const handleSubmit = async () => {
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      if (isRegister) {
        await register(phone.trim(), password, name.trim() || undefined);
      } else {
        await login(phone.trim(), password);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const canSubmit = phone.trim().length > 0 && password.length > 0 && !busy;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}>
            {/* Brand header */}
            <View style={styles.brandHeader}>
              <View style={[styles.logoCircle, { backgroundColor: theme.primary + '18' }]}>
                <AppIcon name="phone" size={30} color={theme.primary} />
              </View>
              <ThemedText type="title" style={styles.title}>
                ilubilu
              </ThemedText>
              <ThemedText type="default" themeColor="textSecondary" style={styles.subtitle}>
                {isRegister ? 'Create an account to start calling' : 'Sign in to keep calling'}
              </ThemedText>
            </View>

            {/* Mode toggle */}
            <View
              style={[
                styles.modePillsContainer,
                { backgroundColor: theme.backgroundElement },
              ]}>
              {(['login', 'register'] as Mode[]).map((m) => {
                const isSelected = mode === m;
                return (
                  <SpringPressable
                    key={m}
                    scaleTo={0.96}
                    onPress={() => switchMode(m)}
                    style={[
                      styles.modePill,
                      isSelected && { backgroundColor: theme.card, ...styles.activeSegmentShadow },
                    ]}>
                    <ThemedText
                      type="smallBold"
                      style={{
                        color: isSelected ? theme.primary : theme.textSecondary,
                      }}>
                      {m === 'login' ? 'Log In' : 'Register'}
                    </ThemedText>
                  </SpringPressable>
                );
              })}
            </View>

            {/* Form card */}
            <View
              style={[
                styles.formCard,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}>
              {isRegister && (
                <View style={styles.field}>
                  <ThemedText type="smallBold" themeColor="textSecondary" style={styles.label}>
                    Name (optional)
                  </ThemedText>
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="Your name"
                    placeholderTextColor={theme.textSecondary}
                    autoCapitalize="words"
                    style={[
                      styles.input,
                      {
                        color: theme.text,
                        backgroundColor: theme.backgroundElement,
                        borderColor: theme.border,
                      },
                    ]}
                  />
                </View>
              )}

              <View style={styles.field}>
                <ThemedText type="smallBold" themeColor="textSecondary" style={styles.label}>
                  Phone number
                </ThemedText>
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="e.g. 01712345678"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={[
                    styles.input,
                    {
                      color: theme.text,
                      backgroundColor: theme.backgroundElement,
                      borderColor: theme.border,
                    },
                  ]}
                />
              </View>

              <View style={styles.field}>
                <ThemedText type="smallBold" themeColor="textSecondary" style={styles.label}>
                  Password
                </ThemedText>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Password"
                  placeholderTextColor={theme.textSecondary}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={[
                    styles.input,
                    {
                      color: theme.text,
                      backgroundColor: theme.backgroundElement,
                      borderColor: theme.border,
                    },
                  ]}
                />
                {isRegister && (
                  <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
                    At least 8 characters, letters and numbers.
                  </ThemedText>
                )}
              </View>

              {error && (
                <View style={[styles.errorBox, { backgroundColor: theme.callRed + '14' }]}>
                  <AppIcon name="info" size={15} color={theme.callRed} />
                  <ThemedText type="small" style={{ color: theme.callRed, flex: 1 }}>
                    {error}
                  </ThemedText>
                </View>
              )}

              <SpringPressable
                scaleTo={0.97}
                disabled={!canSubmit}
                onPress={handleSubmit}
                style={[
                  styles.submitButton,
                  { backgroundColor: theme.primary, opacity: canSubmit ? 1 : 0.5 },
                ]}>
                {busy ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <ThemedText type="smallBold" style={styles.submitLabel}>
                    {isRegister ? 'Create account' : 'Log in'}
                  </ThemedText>
                )}
              </SpringPressable>
            </View>

            <View style={styles.switchRow}>
              <ThemedText type="small" themeColor="textSecondary">
                {isRegister ? 'Already have an account?' : "Don't have an account?"}
              </ThemedText>
              <SpringPressable onPress={() => switchMode(isRegister ? 'login' : 'register')}>
                <ThemedText type="smallBold" style={{ color: theme.primary }}>
                  {isRegister ? ' Log in' : ' Register'}
                </ThemedText>
              </SpringPressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    flexDirection: 'row',
  },
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: Spacing.six,
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: Spacing.five,
    gap: 6,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    textAlign: 'center',
  },
  modePillsContainer: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 3,
    gap: 4,
    marginBottom: Spacing.four,
  },
  modePill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 11,
  },
  activeSegmentShadow: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      },
    }),
  },
  formCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  field: {
    gap: 6,
  },
  label: {
    marginLeft: 2,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: Spacing.three,
    paddingVertical: 12,
    fontSize: 16,
  },
  hint: {
    marginLeft: 2,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    padding: Spacing.two,
  },
  submitButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.one,
  },
  submitLabel: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.four,
  },
});
