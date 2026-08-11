import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import * as adminApi from '@/api/admin.api';
import { ApiError } from '@/api/client';
import { useAuth } from '@/store/auth';
import { colors, radius, space } from '@/theme/tokens';
import { Button, Card, Screen, Text } from '@/ui';

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

/**
 * The review desk.
 *
 * Every doctor is told at signup that an administrator checks their
 * credentials. This screen is where that actually happens — without it the
 * promise is unkeepable and the approval endpoints are reachable only by
 * hand.
 *
 * Two queues, deliberately separate, because they are two different
 * decisions: whether someone is a clinician at all, and whether that
 * clinician may see one particular patient.
 */
export default function Admin() {
  const { authedFetch } = useAuth();

  const [doctors, setDoctors] = useState<adminApi.PendingDoctor[]>([]);
  const [assignments, setAssignments] = useState<adminApi.AdminAssignment[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [d, a] = await Promise.all([
        authedFetch((t) => adminApi.pendingDoctors(t)),
        authedFetch((t) => adminApi.listAssignments(t, 'PENDING')),
      ]);
      setDoctors(d.doctors);
      setAssignments(a.assignments);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load the review queue.');
    } finally {
      setLoading(false);
    }
  }, [authedFetch]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function act(key: string, fn: () => Promise<unknown>) {
    setBusy(key);
    setError(null);
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'That did not work. Please try again.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <Screen>
      <View style={{ gap: space.xs, marginTop: space.sm }}>
        <Text variant="display">Review</Text>
        <Text variant="body" color="textMuted">
          Doctors and patient assignments waiting on you.
        </Text>
      </View>

      {error && (
        <View
          style={{
            backgroundColor: colors.dangerSoft,
            borderRadius: radius.md,
            borderWidth: 2,
            borderColor: colors.danger,
            padding: space.md,
          }}
        >
          <Text variant="body" color="danger">
            {error}
          </Text>
        </View>
      )}

      {/* ------------------------------ doctors ------------------------------ */}

      <Text variant="heading" style={{ marginTop: space.sm }}>
        Doctor applications ({doctors.length})
      </Text>

      {loading ? (
        <Card>
          <Text variant="body" color="textMuted">
            Loading…
          </Text>
        </Card>
      ) : doctors.length === 0 ? (
        <Card>
          <Text variant="body" color="textMuted">
            Nothing waiting. New doctor registrations appear here.
          </Text>
        </Card>
      ) : (
        doctors.map((doctor) => (
          <Card key={doctor.id}>
            <Text variant="heading">{doctor.name}</Text>
            <Text variant="caption" color="textMuted">
              {doctor.email} · applied {formatDate(doctor.created_at)}
            </Text>

            {/* The three fields an admin is actually deciding on. They are
                self-reported and unverified — that is the whole point of the
                review, so they are shown plainly rather than dressed up. */}
            <View style={{ gap: space.xs, marginTop: space.sm }}>
              <Field label="Specialty" value={doctor.specialty} />
              <Field label="Registration no." value={doctor.license_number} />
              {doctor.bio ? <Field label="Bio" value={doctor.bio} /> : null}
              <Field
                label="Email confirmed"
                value={doctor.email_verified_at ? 'Yes' : 'Not yet'}
              />
            </View>

            <Text variant="caption" color="warning">
              Check the registration number against your medical council register before
              approving.
            </Text>

            {doctor.email_verified_at ? (
              <View style={{ flexDirection: 'row', gap: space.md }}>
                <Button
                  label={busy === doctor.id ? 'Working…' : 'Approve'}
                  disabled={busy !== null}
                  onPress={() => act(doctor.id, () => authedFetch((t) => adminApi.approveDoctor(t, doctor.id)))}
                />
                <Button
                  label="Reject"
                  variant="secondary"
                  disabled={busy !== null}
                  onPress={() => act(doctor.id, () => authedFetch((t) => adminApi.disableUser(t, doctor.id)))}
                />
              </View>
            ) : (
              // The server refuses to approve an unconfirmed email, so the
              // button is not offered rather than offered and then failing.
              <Text variant="caption" color="textMuted">
                Cannot be approved until they confirm their email address.
              </Text>
            )}
          </Card>
        ))
      )}

      {/* ---------------------------- assignments ---------------------------- */}

      <Text variant="heading" style={{ marginTop: space.lg }}>
        Patient assignments ({assignments.length})
      </Text>

      {loading ? null : assignments.length === 0 ? (
        <Card>
          <Text variant="body" color="textMuted">
            Nothing waiting. Requests appear here when a patient asks to be connected to
            a doctor.
          </Text>
        </Card>
      ) : (
        assignments.map((a) => (
          <Card key={a.id}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
              <Ionicons name="person-outline" size={22} color={colors.textMuted} />
              <Text variant="label">{a.patient_name}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
              <Ionicons name="medkit-outline" size={22} color={colors.textMuted} />
              <Text variant="label">{a.doctor_name}</Text>
            </View>
            <Text variant="caption" color="textMuted">
              Requested {formatDate(a.requested_at)}
            </Text>
            <Text variant="caption" color="textMuted">
              Approving lets this doctor read this patient’s results.
            </Text>

            <View style={{ flexDirection: 'row', gap: space.md }}>
              <Button
                label={busy === a.id ? 'Working…' : 'Approve'}
                disabled={busy !== null}
                onPress={() => act(a.id, () => authedFetch((t) => adminApi.approveAssignment(t, a.id)))}
              />
              <Button
                label="Reject"
                variant="secondary"
                disabled={busy !== null}
                onPress={() => act(a.id, () => authedFetch((t) => adminApi.rejectAssignment(t, a.id)))}
              />
            </View>
          </Card>
        ))
      )}

      <Button label="Refresh" variant="quiet" onPress={load} />
    </Screen>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: space.sm }}>
      <Text variant="body" color="textMuted" style={{ width: 150 }}>
        {label}
      </Text>
      <Text variant="body" style={{ flex: 1 }}>
        {value}
      </Text>
    </View>
  );
}
