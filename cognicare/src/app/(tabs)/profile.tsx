import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { API_BASE_URL } from '@/api/client';
import { useAuth } from '@/store/auth';
import { useSession } from '@/store/session';
import { pendingCount, pushPending, type SyncResult } from '@/sync/sync';
import { colors, radius, space } from '@/theme/tokens';
import { Button, Card, Screen, Text } from '@/ui';

export default function Profile() {
  const db = useSQLiteContext();
  const router = useRouter();
  const player = useSession((s) => s.player);
  const { user, pendingApproval, accessToken, authedFetch, signOut } = useAuth();

  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<SyncResult | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        if (!player) return;
        const n = await pendingCount(db, player.id);
        if (!cancelled) setPending(n);
      })();
      return () => {
        cancelled = true;
      };
    }, [db, player])
  );

  async function sync() {
    if (!player || !user) return;
    setSyncing(true);
    try {
      const result = await authedFetch((token) => pushPending(db, player.id, user.id, token));
      setLastSync(result);
      setPending(await pendingCount(db, player.id));
    } catch {
      setLastSync({ sessions: 0, assessments: 0, failed: pending });
    } finally {
      setSyncing(false);
    }
  }

  return (
    <Screen>
      <View style={{ gap: space.xs, marginTop: space.sm }}>
        <Text variant="display">Profile</Text>
      </View>

      {/* Signed-in identity, or the local-only player. Both are valid states —
          the exercises never required an account. */}
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: colors.accentSoft,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="person" size={30} color={colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="heading">{user?.name ?? player?.name ?? 'Guest'}</Text>
            <Text variant="body" color="textMuted">
              {user?.email ?? 'Not signed in'}
            </Text>
          </View>
        </View>
      </Card>

      {user ? (
        <Card>
          <Row label="Role" value={user.role.charAt(0) + user.role.slice(1).toLowerCase()} />
          <Row label="Email confirmed" value={user.emailVerified ? 'Yes' : 'Not yet'} />
          {user.role === 'DOCTOR' && (
            <Row
              label="Approved by admin"
              value={user.approvedAt ? 'Yes' : 'Awaiting review'}
            />
          )}
          <Row label="Member since" value={new Date(user.createdAt).toLocaleDateString()} />

          {pendingApproval && (
            <View
              style={{
                backgroundColor: colors.accentSoft,
                borderRadius: radius.md,
                padding: space.md,
                marginTop: space.sm,
              }}
            >
              <Text variant="body" color="accent">
                Your doctor account is still being reviewed. Patient information stays
                hidden until an administrator approves it.
              </Text>
            </View>
          )}
        </Card>
      ) : (
        <Card>
          <Text variant="heading">Playing without an account</Text>
          <Text variant="body" color="textMuted">
            Everything works and is saved on this phone. Sign in only if you want to
            share your progress with a doctor.
          </Text>
          <Button label="Sign in or create an account" onPress={() => router.push('/login')} />
        </Card>
      )}

      {/* Sync is shown, not hidden. Someone handing results to a clinician
          needs to know whether the server has them yet. */}
      <Card>
        <Text variant="heading">Your results</Text>
        {player ? (
          <Text variant="body" color="textMuted">
            {pending === 0
              ? user
                ? 'Everything on this phone has been shared.'
                : 'Saved on this phone.'
              : `${pending} ${pending === 1 ? 'result is' : 'results are'} saved on this phone and not yet shared.`}
          </Text>
        ) : (
          <Text variant="body" color="textMuted">
            Nothing recorded yet.
          </Text>
        )}

        {user && user.role === 'PATIENT' && pending > 0 && (
          <Button label={syncing ? 'Sharing…' : 'Share now'} onPress={sync} disabled={syncing} />
        )}

        {lastSync && (
          <Text variant="caption" color={lastSync.failed > 0 ? 'warning' : 'success'}>
            {lastSync.failed > 0
              ? `${lastSync.failed} could not be sent — they stay on the phone and will retry.`
              : `Shared ${lastSync.sessions} sessions and ${lastSync.assessments} check-ins.`}
          </Text>
        )}
      </Card>

      <Card>
        <Text variant="heading">About</Text>
        <Row label="App" value="CogniCare" />
        <Row label="Server" value={API_BASE_URL.replace('/api/v1', '')} />
        <Text variant="caption" color="textMuted">
          These exercises are for practice and tracking. They are not a medical
          diagnosis.
        </Text>
      </Card>

      {user && (
        <Button
          label="Sign out"
          variant="secondary"
          onPress={async () => {
            await signOut();
            router.replace('/login');
          }}
        />
      )}
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.md }}>
      <Text variant="body" color="textMuted">
        {label}
      </Text>
      <Text variant="label" style={{ flexShrink: 1, textAlign: 'right' }}>
        {value}
      </Text>
    </View>
  );
}
