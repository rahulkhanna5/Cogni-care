import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { ApiError } from '@/api/client';
import * as doctorApi from '@/api/doctor.api';
import { useAuth } from '@/store/auth';
import { colors, space } from '@/theme/tokens';
import { Button, Card, Screen, Text } from '@/ui';

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
        <Text variant="body" color="textMuted">
          {user?.name ? `Signed in as ${user.name}` : ''}
        </Text>
      </View>

      {/* The pending state is called out separately from a generic failure:
          it resolves by waiting, and saying "could not load" would be wrong. */}
      {error?.code === 'DOCTOR_PENDING_APPROVAL' ? (
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <Ionicons name="hourglass-outline" size={28} color={colors.accent} />
            <Text variant="heading">Awaiting approval</Text>
          </View>
          <Text variant="body" color="textMuted">
            An administrator is reviewing your registration. Patients cannot be assigned
            to you until that is done.
          </Text>
          <Button label="Check again" variant="secondary" onPress={load} />
        </Card>
      ) : error ? (
        <Card>
          <Text variant="heading" color="danger">
            {error.message}
          </Text>
          <Button label="Try again" variant="secondary" onPress={load} />
        </Card>
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
          <Card key={patient.id} onPress={() => router.push({ pathname: '/patient/[id]', params: { id: patient.id } })}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: colors.accentSoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text variant="label" color="accent">
                  {patient.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="heading">{patient.name}</Text>
                <Text variant="caption" color="textMuted">
                  {patient.email}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color={colors.textMuted} />
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}
