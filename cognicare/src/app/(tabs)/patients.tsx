import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { ApiError } from '@/api/client';
import * as doctorApi from '@/api/doctor.api';
import { useAuth } from '@/store/auth';
import { colors, space } from '@/theme/tokens';
import { Banner, Button, Card, Screen, SurfaceProvider, Text } from '@/ui';

/**
 * The doctor's patient list.
 *
 * Nothing is filtered on the client. The server builds this list FROM the
 * assignments table, so an unassigned patient is not omitted here — they were
 * never sent. There is no client-side check to forget.
 */
export default function Patients() {
  const router = useRouter();
  const { user, authedFetch } = useAuth();

  const [patients, setPatients] = useState<doctorApi.PatientSummary[]>([]);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { patients: rows } = await authedFetch((token) => doctorApi.listPatients(token));
      setPatients(rows);
    } catch (e) {
      setError(
        e instanceof ApiError
          ? { code: e.code, message: e.message }
          : { code: 'UNKNOWN', message: 'Could not load your patients.' }
      );
    } finally {
      setLoading(false);
    }
  }, [authedFetch]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <Screen>
      <View style={{ gap: space.xs, marginTop: space.sm }}>
        <Text variant="display">Your patients</Text>
        {user?.name ? (
          <Text variant="body" color="textMuted">
            Signed in as {user.name}
          </Text>
        ) : null}
      </View>

      {/* The pending state is called out separately from a generic failure:
          it resolves by waiting, and saying "could not load" would be wrong. */}
      {error?.code === 'DOCTOR_PENDING_APPROVAL' ? (
        <>
          <Banner tone="info">
            <Text variant="label">Awaiting approval</Text>
            <Text variant="body">
              An administrator is reviewing your registration. Patients cannot be assigned
              to you until that is done.
            </Text>
          </Banner>
          <Button label="Check again" variant="secondary" icon="refresh" busy={loading} onPress={load} />
        </>
      ) : error ? (
        <>
          <Banner tone="error">{error.message}</Banner>
          <Button label="Try again" variant="secondary" icon="refresh" busy={loading} onPress={load} />
        </>
      ) : loading ? (
        <Card>
          <Text variant="body" color="textMuted">
            Loading…
          </Text>
        </Card>
      ) : patients.length === 0 ? (
        <Card>
          <Text variant="heading">No patients yet</Text>
          <Text variant="body" color="textMuted">
            Patients appear here once they have requested you and an administrator has
            approved the assignment.
          </Text>
        </Card>
      ) : (
        patients.map((patient) => (
          <Card
            key={patient.id}
            accessibilityLabel={`${patient.name}, ${patient.email}`}
            onPress={() => router.push({ pathname: '/patient/[id]', params: { id: patient.id } })}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <SurfaceProvider value="selected">
                <View
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 26,
                    backgroundColor: colors.selected,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text variant="heading" color="accent">
                    {patient.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              </SurfaceProvider>
              <View style={{ flex: 1 }}>
                <Text variant="heading">{patient.name}</Text>
                <Text variant="caption" color="textMuted">
                  {patient.email}
                </Text>
              </View>
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}
