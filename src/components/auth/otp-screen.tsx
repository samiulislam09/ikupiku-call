import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    AppState,
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

const CODE_LENGTH = 6;
const DEFAULT_COOLDOWN_SECONDS = 60;

/**
 * Phone-verification step between register/login and the full app —
 * rendered by AuthGate while auth status is 'pendingVerification'. The
 * backend auto-sends a code on register (and on an unverified login);
 * auth-context's otpSentAt seeds the resend cooldown for those sends.
 */
export function OtpScreen() {
  const theme = useTheme();
  const { user, verifyOtp, resendOtp, logout, otpSentAt, otpDevCode, otpExpiresInMinutes } =
    useAuth();

  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Timestamp math (not a decrementing counter) so backgrounding never
  // drifts the countdown; `now` just triggers repaints while it runs.
  const [cooldownEndsAt, setCooldownEndsAt] = useState<number | null>(
    otpSentAt ? otpSentAt + DEFAULT_COOLDOWN_SECONDS * 1000 : null
  );
  const [now, setNow] = useState(() => Date.now());
  const inputRef = useRef<TextInput>(null);

  const cooldownRemaining = cooldownEndsAt
    ? Math.max(0, Math.ceil((cooldownEndsAt - now) / 1000))
    : 0;
  const canResend = !resendBusy && cooldownRemaining === 0;
  const canVerify = code.length === CODE_LENGTH && !busy;

  useEffect(() => {
    if (cooldownRemaining <= 0) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [cooldownRemaining]);

  // Snap the countdown to the correct value the moment the app foregrounds.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setNow(Date.now());
    });
    return () => sub.remove();
  }, []);

  const handleVerify = useCallback(
    async (submitted: string) => {
      if (busy) return;
      setError(null);
      setBusy(true);
      try {
        await verifyOtp(submitted);
        // Success flips AuthGate to the full app — nothing else to do here.
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
        setCode('');
        inputRef.current?.focus();
      } finally {
        setBusy(false);
      }
    },
    [busy, verifyOtp]
  );

  const handleCodeChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, CODE_LENGTH);
    setCode(digits);
    if (digits.length === CODE_LENGTH) {
      void handleVerify(digits);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    setError(null);
    setResendBusy(true);
    try {
      const result = await resendOtp();
      setCooldownEndsAt(Date.now() + (result.cooldownSeconds ?? DEFAULT_COOLDOWN_SECONDS) * 1000);
      setNow(Date.now());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send the code. Please try again.');
      // The server said no (usually its own cooldown) — hold a local
      // cooldown too rather than inviting immediate hammering.
      setCooldownEndsAt(Date.now() + DEFAULT_COOLDOWN_SECONDS * 1000);
      setNow(Date.now());
    } finally {
      setResendBusy(false);
    }
  };

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
            <View style={styles.brandHeader}>
              <View style={[styles.logoCircle, { backgroundColor: theme.primary + '18' }]}>
                <AppIcon name="message" size={30} color={theme.primary} />
              </View>
              <ThemedText type="title" style={styles.title}>
                Verify your number
              </ThemedText>
              <ThemedText type="default" themeColor="textSecondary" style={styles.subtitle}>
                We sent a {CODE_LENGTH}-digit code to {user?.phone ?? 'your phone'}. It expires in
                about {otpExpiresInMinutes ?? 5} minute{(otpExpiresInMinutes ?? 5) === 1 ? '' : 's'}.
              </ThemedText>
            </View>

            <View
              style={[
                styles.formCard,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}>
              <View style={styles.field}>
                <ThemedText type="smallBold" themeColor="textSecondary" style={styles.label}>
                  Verification code
                </ThemedText>
                <TextInput
                  ref={inputRef}
                  value={code}
                  onChangeText={handleCodeChange}
                  placeholder="••••••"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="number-pad"
                  autoComplete="sms-otp"
                  textContentType="oneTimeCode"
                  maxLength={CODE_LENGTH}
                  autoFocus
                  editable={!busy}
                  style={[
                    styles.input,
                    styles.codeInput,
                    {
                      color: theme.text,
                      backgroundColor: theme.backgroundElement,
                      borderColor: theme.border,
                    },
                  ]}
                />
              </View>

              {error && (
                <View style={[styles.errorBox, { backgroundColor: theme.callRed + '14' }]}>
                  <AppIcon name="info" size={15} color={theme.callRed} />
                  <ThemedText type="small" style={{ color: theme.callRed, flex: 1 }}>
                    {error}
                  </ThemedText>
                </View>
              )}

              {/* Present only when the backend runs in SMS dev mode (no
                  real SMS goes out there) — never sent by production. */}
              {otpDevCode && (
                <View style={[styles.errorBox, { backgroundColor: theme.primary + '14' }]}>
                  <AppIcon name="info" size={15} color={theme.primary} />
                  <ThemedText type="small" themeColor="textSecondary" style={{ flex: 1 }}>
                    Dev mode — your code is {otpDevCode}
                  </ThemedText>
                </View>
              )}

              <SpringPressable
                scaleTo={0.97}
                disabled={!canVerify}
                onPress={() => void handleVerify(code)}
                style={[
                  styles.submitButton,
                  { backgroundColor: theme.primary, opacity: canVerify ? 1 : 0.5 },
                ]}>
                {busy ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <ThemedText type="smallBold" style={styles.submitLabel}>
                    Verify
                  </ThemedText>
                )}
              </SpringPressable>

              <View style={styles.resendRow}>
                {resendBusy ? (
                  <ActivityIndicator size="small" color={theme.textSecondary} />
                ) : (
                  <SpringPressable disabled={!canResend} onPress={() => void handleResend()}>
                    <ThemedText
                      type="smallBold"
                      style={{ color: canResend ? theme.primary : theme.textSecondary }}>
                      {canResend
                        ? otpSentAt
                          ? 'Resend code'
                          : 'Send code'
                        : `Resend in ${cooldownRemaining}s`}
                    </ThemedText>
                  </SpringPressable>
                )}
              </View>
            </View>

            <View style={styles.switchRow}>
              <ThemedText type="small" themeColor="textSecondary">
                Wrong number?
              </ThemedText>
              <SpringPressable onPress={() => void logout()}>
                <ThemedText type="smallBold" style={{ color: theme.primary }}>
                  {' '}
                  Use a different number
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
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    textAlign: 'center',
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
  codeInput: {
    textAlign: 'center',
    fontSize: 24,
    letterSpacing: 12,
    fontVariant: ['tabular-nums'],
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
  resendRow: {
    alignItems: 'center',
    marginTop: Spacing.one,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.four,
  },
});
