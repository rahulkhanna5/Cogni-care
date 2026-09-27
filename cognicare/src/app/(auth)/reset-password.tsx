import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import * as api from '@/api/auth.api';
import { ApiError } from '@/api/client';
import { space } from '@/theme/tokens';
import { Banner, Button, HeroIcon, Screen, Text, TextField } from '@/ui';

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
  const ready = token.trim().length > 0 && password.length >= 10 && passwordsMatch;

  // Say which condition is still missing, not just that something is.
  const reason = !token.trim()
    ? 'Paste the code from your email to continue.'
    : password.length < 10
      ? 'Your new password needs at least 10 characters.'
      : 'Type the same password twice to continue.';

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await api.resetPassword(token.trim(), password);
      setDone(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not reset the password. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <Screen>
        <View style={{ gap: space.md, marginTop: space.xxl }}>
          <HeroIcon name="checkmark" tone="success" />
          <Text variant="display" center>
            Password updated
          </Text>
          <Text variant="body" color="textMuted" center>
            Sign in with your new password. For safety, this also signed you out everywhere
            else.
          </Text>
        </View>

        <Button label="Go to sign in" onPress={() => router.replace('/login')} style={{ marginTop: space.lg }} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={{ gap: space.sm, marginTop: space.xl }}>
        <Text variant="display">Choose a new password</Text>
        <Text variant="body" color="textMuted">
          {tokenParam
            ? 'Set a new password below.'
            : 'Paste the code from your reset email, then set a new password.'}
        </Text>
      </View>

      {!tokenParam && (
        <TextField
          label="Reset code"
          value={token}
          onChangeText={setToken}
          placeholder="Paste the code from your email"
          autoCapitalize="none"
          autoCorrect={false}
        />
      )}

      <TextField
        label="New password (at least 10 characters)"
        value={password}
        onChangeText={setPassword}
        placeholder="New password"
        secureTextEntry
        autoCapitalize="none"
        textContentType="newPassword"
      />

      <TextField
        label="Confirm new password"
        value={confirm}
        onChangeText={setConfirm}
        placeholder="Type it again"
        secureTextEntry
        autoCapitalize="none"
        textContentType="newPassword"
        error={confirm.length > 0 && !passwordsMatch ? 'Passwords do not match.' : null}
      />

      {error && <Banner tone="error">{error}</Banner>}

      <Button
        label={busy ? 'Updating…' : 'Update password'}
        onPress={submit}
        busy={busy}
        disabled={!ready}
        disabledReason={reason}
      />

      <Button label="Back to sign in" variant="quiet" onPress={() => router.replace('/login')} />
    </Screen>
  );
}
