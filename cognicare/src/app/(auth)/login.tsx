import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { ApiError } from '@/api/client';
import { useAuth } from '@/store/auth';
import { space } from '@/theme/tokens';
import { Banner, Button, Logo, Screen, Text, TextField } from '@/ui';

export default function Login() {
  const router = useRouter();
  const signIn = useAuth((s) => s.signIn);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const filled = email.trim().length > 0 && password.length > 0;

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

      // Through the boot router rather than straight to the dashboard, so a
      // signed-in patient gets a local profile made from their account name
      // instead of being asked for their name a second time.
      router.replace('/');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not sign in. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <View style={{ gap: space.md, marginTop: space.xl }}>
        <Logo size={64} />
        <View style={{ gap: space.xs }}>
          <Text variant="display">Welcome back</Text>
          <Text variant="body" color="textMuted">
            Sign in to continue.
          </Text>
        </View>
      </View>

      <View style={{ gap: space.md, marginTop: space.sm }}>
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          returnKeyType="next"
        />
        <TextField
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="Your password"
          secureTextEntry
          autoCapitalize="none"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={() => filled && !busy && submit()}
        />
        <Button
          label="Forgot password?"
          variant="quiet"
          fullWidth={false}
          onPress={() => router.push('/forgot-password')}
          style={{ alignSelf: 'flex-start' }}
        />
      </View>

      {error && <Banner tone="error">{error}</Banner>}

      <Button
        label={busy ? 'Signing in…' : 'Sign in'}
        onPress={submit}
        busy={busy}
        disabled={!filled}
        disabledReason="Fill in both fields to continue."
      />

      {/* Register already asks "patient or doctor?" — this points there
          rather than adding a toggle here that could not do anything: the
          account itself decides the role, re-checked on every request. */}
      <Button
        label="New here? Create a patient or doctor account"
        variant="secondary"
        onPress={() => router.push('/register')}
      />

      <Button
        label="Continue without an account"
        variant="quiet"
        onPress={() => router.replace('/welcome')}
      />

      <Text variant="caption" color="textMuted" center>
        You can use the exercises without signing in. An account is only needed to
        share your progress with a doctor.
      </Text>
    </Screen>
  );
}
