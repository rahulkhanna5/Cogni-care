import { useRouter } from 'expo-router';
import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { ApiError } from '@/api/client';
import { useAuth } from '@/store/auth';
import { colors, radius, space, TOUCH_MIN } from '@/theme/tokens';
import { Button, Screen, Text } from '@/ui';

export default function Login() {
  const router = useRouter();
  const signIn = useAuth((s) => s.signIn);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const canSubmit = email.trim().length > 0 && password.length > 0 && !busy;

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const user = await signIn(email.trim(), password);

      if (user.role === 'DOCTOR') {
        // Only an UNAPPROVED doctor belongs on the waiting screen. Routing
        // every doctor there sent approved ones to "Awaiting approval" even
        // though their patient list was ready — read the flag the login
        // response already returns.
        const { pendingApproval } = useAuth.getState();
        router.replace(pendingApproval ? '/pending' : '/patients');
        return;
      }

      if (user.role === 'ADMIN') {
        router.replace('/admin');
        return;
      }

      router.replace('/dashboard');
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : 'Could not sign in. Please try again.'
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <View style={{ gap: space.sm, marginTop: space.xxl }}>
        <Text variant="display">Welcome back</Text>
        <Text variant="body" color="textMuted">
          Sign in to continue.
        </Text>
      </View>

      <View style={{ gap: space.md, marginTop: space.xl }}>
        <View style={{ gap: space.sm }}>
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

        <View style={{ gap: space.sm }}>
          <Text variant="label">Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Your password"
            placeholderTextColor={colors.disabled}
            secureTextEntry
            autoCapitalize="none"
            textContentType="password"
            style={inputStyle}
          />
        </View>
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
        label={busy ? 'Signing in…' : 'Sign in'}
        onPress={submit}
        disabled={!canSubmit}
        style={{ marginTop: space.lg }}
      />

      <Button
        label="Create an account"
        variant="secondary"
        onPress={() => router.push('/register')}
        style={{ marginTop: space.sm }}
      />

      <Button
        label="Continue without an account"
        variant="quiet"
        onPress={() => router.replace('/welcome')}
        style={{ marginTop: space.sm }}
      />

      <Text variant="caption" color="textMuted" center style={{ marginTop: space.md }}>
        You can use the exercises without signing in. An account is only needed
        to share your progress with a doctor.
      </Text>
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
