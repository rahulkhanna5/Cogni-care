import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import * as api from '@/api/auth.api';
import { useAuth } from '@/store/auth';
import { space } from '@/theme/tokens';
import { Banner, Button, Card, HeroIcon, Screen, Text } from '@/ui';

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
  const [stillWaiting, setStillWaiting] = useState(false);

  async function recheck() {
    setChecking(true);
    setStillWaiting(false);
    try {
      const { user: fresh, pendingApproval } = await authedFetch((token) => api.me(token));
      useAuth.setState({ user: fresh, pendingApproval });
      // An approved doctor's home is their patient list — this used to send
      // them to the patient dashboard, a screen with no meaning for a doctor.
      if (!pendingApproval) router.replace('/patients');
      else setStillWaiting(true);
    } catch {
      // Stay put — the screen is already the "nothing to do yet" state.
    } finally {
      setChecking(false);
    }
  }

  return (
    <Screen>
      <View style={{ gap: space.md, marginTop: space.xxl }}>
        <HeroIcon name="hourglass-outline" />
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

      {stillWaiting && <Banner tone="info">Still being reviewed. Please check again later.</Banner>}

      <Button label={checking ? 'Checking…' : 'Check again'} busy={checking} onPress={recheck} />

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
