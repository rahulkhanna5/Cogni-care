import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { colors, space } from '@/theme/tokens';
import { Banner, Button, Card, Skeleton, Text } from '@/ui';
import { RateDoctor } from './RateDoctor';
import { describeRequest, visibleRequests } from './status';
import { useMyRequests } from './useMyRequests';

const TONE_ICON = {
  info: 'time-outline',
  success: 'checkmark-circle',
  warning: 'alert-circle-outline',
} as const;

/**
 * "Your doctor" on a signed-in patient's profile: who they have asked, where
 * each request stands, and the one-tap way to stop sharing. Withdrawing needs a
 * second tap on purpose — it cuts a doctor off immediately — but never an
 * administrator, because consent is the patient's to take back.
 */
export function MyDoctorCard() {
  const router = useRouter();
  const { requests, loading, busyId, error, load, stop } = useMyRequests();
  const [confirming, setConfirming] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const shown = visibleRequests(requests);

  return (
    <Card style={{ gap: space.md }}>
      <View style={{ gap: space.xs }}>
        <Text variant="heading">Your doctor</Text>
        <Text variant="body" color="textMuted">
          Choose a doctor to share your results with. You stay in control.
        </Text>
      </View>

      {error && <Banner tone="error">{error}</Banner>}

      {loading ? (
        <View accessible accessibilityLabel="Loading" style={{ gap: 8 }}>
          <Skeleton width="60%" height={18} />
          <Skeleton width="90%" />
        </View>
      ) : (
        shown.map((a) => {
          const view = describeRequest(a);
          const asking = confirming === a.id;
          return (
            <View
              key={a.id}
              style={{ gap: space.sm, paddingTop: space.sm, borderTopWidth: 1, borderTopColor: colors.divider }}
            >
              <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' }}>
                <Ionicons
                  name={TONE_ICON[view.tone]}
                  size={24}
                  color={
                    view.tone === 'success' ? colors.success : view.tone === 'warning' ? colors.warning : colors.edge
                  }
                  style={{ marginTop: 2 }}
                />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="label">{view.headline}</Text>
                  <Text variant="body" color="textMuted">
                    {view.detail}
                  </Text>
                </View>
              </View>

              {a.doctor_accepted_at && a.status === 'ACTIVE' && !asking && (
                <RateDoctor assignment={a} onSaved={load} />
              )}

              {view.action && !asking && (
                <Button
                  label={view.action === 'withdraw' ? 'Withdraw request' : 'Stop sharing'}
                  variant="secondary"
                  icon={view.action === 'withdraw' ? 'close-circle-outline' : 'hand-left-outline'}
                  onPress={() => setConfirming(a.id)}
                />
              )}

              {asking && (
                <View style={{ gap: space.sm }}>
                  <Text variant="body">
                    {a.status === 'ACTIVE'
                      ? `${a.doctor_name} will no longer see your results.`
                      : 'Withdraw this request?'}
                  </Text>
                  <Button
                    label={a.status === 'ACTIVE' ? 'Yes, stop sharing' : 'Yes, withdraw'}
                    busy={busyId === a.id}
                    onPress={async () => {
                      await stop(a.id);
                      setConfirming(null);
                    }}
                  />
                  <Button label="Keep it" variant="secondary" onPress={() => setConfirming(null)} />
                </View>
              )}
            </View>
          );
        })
      )}

      {!loading && shown.length === 0 && (
        <Text variant="body" color="textMuted">
          You are not sharing with a doctor yet.
        </Text>
      )}

      <Button
        label={
          shown.some((a) => a.status === 'ACTIVE' || a.status === 'PENDING') ? 'Choose another doctor' : 'Find a doctor'
        }
        icon="search-outline"
        variant={shown.some((a) => a.status === 'ACTIVE' || a.status === 'PENDING') ? 'secondary' : 'primary'}
        onPress={() => router.push('/find-doctor')}
      />
    </Card>
  );
}
