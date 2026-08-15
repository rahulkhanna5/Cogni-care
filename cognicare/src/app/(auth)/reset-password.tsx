import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { TextInput, View } from 'react-native';

import * as api from '@/api/auth.api';
import { ApiError } from '@/api/client';
import { colors, radius, space, TOUCH_MIN } from '@/theme/tokens';
import { Button, Screen, Text } from '@/ui';

export default function ResetPassword() {
  const router = useRouter();
  // Pre-filled when arriving from the dev shortcut on /forgot-password; blank
  // when someone opened this screen from a real reset link instead, which is
  // exactly the same "may or may not be pre-filled" shape /verify-email uses.
  const { token: tokenParam } = useLocalSearchParams<{ token?: string }>();

  const [token, setToken] = useState(tokenParam ?? '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const passwordsMatch = password.length > 0 && password === confirm;
  const canSubmit = token.trim().length > 0 && password.length >= 10 && passwordsMatch && !busy;

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await api.resetPassword(token.trim(), password);
      setDone(true);
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : 'Could not reset the password. Please try again.'
      );
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <Screen>
        <View style={{ gap: space.sm, marginTop: space.xxl }}>
          <Text variant="display">Password updated</Text>
          <Text variant="body" color="textMuted">
            Sign in with your new password. For safety, this also signed you out everywhere
            else.
          </Text>
        </View>

        <Button
          label="Go to sign in"
          onPress={() => router.replace('/login')}
          style={{ marginTop: space.lg }}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={{ gap: space.sm, marginTop: space.xxl }}>
        <Text variant="display">Choose a new password</Text>
        <Text variant="body" color="textMuted">
          {tokenParam
            ? 'Set a new password below.'
            : 'Paste the code from your reset email, then set a new password.'}
        </Text>
      </View>

      <View style={{ gap: space.md, marginTop: space.xl }}>
        {!tokenParam && (
          <View style={{ gap: space.sm }}>
            <Text variant="label">Reset code</Text>
            <TextInput
              value={token}
              onChangeText={setToken}
              placeholder="Paste the code from your email"
              placeholderTextColor={colors.disabled}
              autoCapitalize="none"
              autoCorrect={false}
              style={inputStyle}
            />
          </View>
        )}

        <View style={{ gap: space.sm }}>
          <Text variant="label">New password (at least 10 characters)</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="New password"
            placeholderTextColor={colors.disabled}
            secureTextEntry
            autoCapitalize="none"
            textContentType="newPassword"
            style={inputStyle}
          />
        </View>

        <View style={{ gap: space.sm }}>
          <Text variant="label">Confirm new password</Text>
          <TextInput
            value={confirm}
            onChangeText={setConfirm}
            placeholder="Type it again"
            placeholderTextColor={colors.disabled}
            secureTextEntry
            autoCapitalize="none"
            textContentType="newPassword"
            style={inputStyle}
          />
          {confirm.length > 0 && !passwordsMatch && (
            <Text variant="caption" color="danger">
              Passwords do not match.
            </Text>
          )}
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
        label={busy ? 'Updating…' : 'Update password'}
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
