import { useRouter } from 'expo-router';
import { useState } from 'react';
import { TextInput, View } from 'react-native';

import * as api from '@/api/auth.api';
import { ApiError } from '@/api/client';
import { colors, radius, space, TOUCH_MIN } from '@/theme/tokens';
import { Button, Screen, Text } from '@/ui';

export default function ForgotPassword() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Set once the server has answered. The uniform message is shown either
  // way — see the note below on why that has to stay true even here.
  const [sent, setSent] = useState(false);

  const canSubmit = email.trim().length > 0 && !busy;

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const result = await api.forgotPassword(email.trim());

      // Dev convenience only: outside production the server has no mail
      // provider wired up, so it hands the token back directly instead of
      // emailing it. Jumping straight to the reset screen with it pre-filled
      // is the same shortcut /register already takes with its own token —
      // this screen's "check your email" state is for the production path
      // only, so it is never shown when a dev token comes back.
      if (result.devResetToken) {
        router.push({ pathname: '/reset-password', params: { token: result.devResetToken } });
        return;
      }

      setSent(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <Screen>
        <View style={{ gap: space.sm, marginTop: space.xxl }}>
          <Text variant="display">Check your email</Text>
          <Text variant="body" color="textMuted">
            If {email.trim()} is registered, we have sent a link to reset the password. It
            expires in 30 minutes.
          </Text>
        </View>

        <Button
          label="Back to sign in"
          onPress={() => router.replace('/login')}
          style={{ marginTop: space.lg }}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={{ gap: space.sm, marginTop: space.xxl }}>
        <Text variant="display">Reset your password</Text>
        <Text variant="body" color="textMuted">
          Enter the email on your account. If it is registered, we will send a link to reset
          your password.
        </Text>
      </View>

      <View style={{ gap: space.sm, marginTop: space.xl }}>
        <Text variant="label">Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor={colors.disabled}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          style={inputStyle}
        />
      </View>

      {error && (
        <View
          style={{
            backgroundColor: colors.dangerSoft,
            borderRadius: radius.md,
            borderWidth: 2,
            borderColor: colors.danger,
            padding: space.md,
            marginTop: space.md,
          }}
        >
          <Text variant="body" color="danger">
            {error}
          </Text>
        </View>
      )}

      <Button
        label={busy ? 'Sending…' : 'Send reset link'}
        onPress={submit}
        disabled={!canSubmit}
        style={{ marginTop: space.lg }}
      />

      <Button
        label="Back to sign in"
        variant="quiet"
        onPress={() => router.replace('/login')}
        style={{ marginTop: space.sm }}
      />
    </Screen>
  );
}

const inputStyle = {
  minHeight: TOUCH_MIN,
  borderWidth: 2,
  borderColor: colors.border,
  borderRadius: radius.md,
  backgroundColor: colors.surface,
  paddingHorizontal: space.md,
  fontSize: 20,
  color: colors.text,
} as const;
