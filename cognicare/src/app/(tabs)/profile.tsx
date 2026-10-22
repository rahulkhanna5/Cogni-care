import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { API_BASE_URL } from '@/api/client';
import { MyReviews } from '@/care/doctor/MyReviews';
import { DoctorNotesCard } from '@/care/DoctorNotesCard';
import { MyDoctorCard } from '@/care/MyDoctorCard';
import { useT } from '@/i18n';
import { useAuth } from '@/store/auth';
import { useSession } from '@/store/session';
import { pendingCount, pushPending, type SyncResult } from '@/sync/sync';
import { colors, space } from '@/theme/tokens';
import { Banner, Button, Card, InfoRow, Screen, Text } from '@/ui';

export default function Profile() {
  const db = useSQLiteContext();
  const router = useRouter();
  const player = useSession((s) => s.player);
  const { user, pendingApproval, authedFetch, signOut } = useAuth();
  const t = useT();

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

  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.sm }}>
        <Text variant="display">{t('profile.title')}</Text>
        <Button
          label={t('profile.settings')}
          variant="quiet"
          icon="settings-outline"
          fullWidth={false}
          onPress={() => router.push('/settings')}
        />
      </View>

      {/* Signed-in identity, or the local-only player. Both are valid states —
          the exercises never required an account. */}
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: colors.tint,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="person" size={34} color={colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="heading">{user?.name ?? player?.name ?? t('profile.guest')}</Text>
            <Text variant="body" color="textMuted">
              {user?.email ?? t('profile.notSignedIn')}
            </Text>
          </View>
        </View>
      </Card>

      {user ? (
        <Card>
          <InfoRow label="Role" value={user.role.charAt(0) + user.role.slice(1).toLowerCase()} />
          <InfoRow label="Email confirmed" value={user.emailVerified ? 'Yes' : 'Not yet'} />
          {user.role === 'DOCTOR' && (
            <InfoRow label="Approved by admin" value={user.approvedAt ? 'Yes' : 'Awaiting review'} />
          )}
          <InfoRow label="Member since" value={new Date(user.createdAt).toLocaleDateString()} />
        </Card>
      ) : (
        <Card style={{ gap: space.md }}>
          <View style={{ gap: space.xs }}>
            <Text variant="heading">Playing without an account</Text>
            <Text variant="body" color="textMuted">
              Everything works and is saved on this phone. Sign in only if you want to
              share your progress with a specialist.
            </Text>
          </View>
          <Button label="Sign in or create an account" onPress={() => router.push('/login')} />
        </Card>
      )}

      {pendingApproval && (
        <Banner tone="info">
          Your specialist account is still being reviewed. Member information stays hidden
          until an administrator approves it.
        </Banner>
      )}

      {/* Sync is shown, not hidden. Someone handing results to a clinician
          needs to know whether the server has them yet. */}
      <Card style={{ gap: space.md }}>
        <Text variant="heading">Your results</Text>
        {player ? (
          <Text variant="body" color="textMuted">
            {pending === 0
              ? user
                ? 'Everything on this phone has been shared.'
                : 'Saved on this phone.'
              : `${plural(pending, 'result is', 'results are')} saved on this phone and not yet shared.`}
          </Text>
        ) : (
          <Text variant="body" color="textMuted">
            Nothing recorded yet.
          </Text>
        )}

        {user && user.role === 'PATIENT' && pending > 0 && (
          <Button
            label={syncing ? 'Sharing…' : 'Share now'}
            icon="cloud-upload-outline"
            busy={syncing}
            onPress={sync}
          />
        )}

        {lastSync &&
          (lastSync.failed > 0 ? (
            <Banner tone="warning">
              {`${lastSync.failed} could not be sent — they stay on the phone and will retry.`}
            </Banner>
          ) : (
            <Banner tone="success">
              {`Shared ${plural(lastSync.sessions, 'session', 'sessions')} and ${plural(lastSync.assessments, 'check-in', 'check-ins')}.`}
            </Banner>
          ))}
      </Card>

      {/* Who this patient shares with. Patients only: a doctor or admin has no
          results of their own to share. */}
      {user?.role === 'PATIENT' && <MyDoctorCard />}
      {user?.role === 'PATIENT' && <DoctorNotesCard />}
      {user?.role === 'DOCTOR' && user.approvedAt && <MyReviews />}

      <Card style={{ gap: space.md }}>
        <Text variant="heading">About</Text>
        <View style={{ gap: space.xs }}>
          <InfoRow label="App" value="CogniCare" />
          <InfoRow label="Server" value={API_BASE_URL.replace('/api/v1', '')} />
        </View>
        <Text variant="caption" color="textMuted">
          These exercises are for practice and tracking. They are not a medical
          diagnosis.
        </Text>
        <Button
          label="Why this works"
          variant="quiet"
          icon="book-outline"
          fullWidth={false}
          onPress={() => router.push('/about')}
          style={{ alignSelf: 'flex-start' }}
        />
      </Card>

      {user && (
        <Button
          label={t('profile.signOut')}
          variant="secondary"
          icon="log-out-outline"
          onPress={async () => {
            await signOut();
            router.replace('/login');
          }}
        />
      )}
    </Screen>
  );
}
