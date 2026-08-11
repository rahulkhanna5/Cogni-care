import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import * as api from '@/api/auth.api';
import { useAuth } from '@/store/auth';
import { colors, space } from '@/theme/tokens';
import { Button, Card, Screen, Text } from '@/ui';

/**
 * Where an approved-pending doctor lands.
 *
 * The backend returns DOCTOR_PENDING_APPROVAL rather than a generic 403
 * precisely so this screen can exist: the situation resolves by waiting, not
 * by the user doing anything differently, and a bare "access denied" would
 * read as an error they caused.
 */
export default function Pending() {
  const router = useRouter();
  const { user, authedFetch, signOut } = useAuth();
  const [checking, setChecking] = useState(false);

  async function recheck() {
    setChecking(true);
    try {
      const { user: fresh, pendingApproval } = await authedFetch((token) => api.me(token));
      useAuth.setState({ user: fresh, pendingApproval });
      if (!pendingApproval) router.replace('/dashboard');
    } catch {
      // Stay put — the screen is already the "nothing to do yet" state.
    } finally {
      setChecking(false);
    }
  }

  return (
    <Screen>
      <View style={{ alignItems: 'center', marginTop: space.xxl, gap: space.md }}>
        <Ionicons name="hourglass-outline" size={72} color={colors.accent} />
        <Text variant="display" center>
          Awaiting approval
        </Text>
      </View>

      <Card>
        <Text variant="body">
          Thanks{user?.name ? `, ${user.name}` : ''} — your account has been created and
          your email is confirmed.
        </Text>
        <Text variant="body" color="textMuted">
          An administrator now reviews your specialty and registration number. Until
          that is done you cannot be connected to patients, and no patient
          information is visible.
        </Text>
        <Text variant="caption" color="textMuted">
          You will not lose anything by closing the app — just sign in again later.
        </Text>
      </Card>

      <Button
        label={checking ? 'Checking…' : 'Check again'}
        onPress={recheck}
        disabled={checking}
      />

      <Button
        label="Sign out"
        variant="quiet"
        onPress={async () => {
          await signOut();
          router.replace('/login');
        }}
      />
    </Screen>
  );
}
