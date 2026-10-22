import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { ConnectionsPanel } from '@/admin/ConnectionsPanel';
import { DoctorsPanel } from '@/admin/DoctorsPanel';
import { PatientsPanel } from '@/admin/PatientsPanel';
import * as adminApi from '@/api/admin.api';
import { ApiError } from '@/api/client';
import { SegmentTabs } from '@/care/doctor/parts';
import { useAuth } from '@/store/auth';
import { colors, space } from '@/theme/tokens';
import { Banner, Button, Card, InfoRow, Screen, SkeletonList, StatTile, Text } from '@/ui';

type Section = 'review' | 'connections' | 'patients' | 'doctors';

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
  const [section, setSection] = useState<Section>('review');
  const [allPatients, setAllPatients] = useState<adminApi.AdminPatient[]>([]);
  const [allDoctors, setAllDoctors] = useState<adminApi.AdminDoctor[]>([]);
  const [connections, setConnections] = useState<Awaited<ReturnType<typeof adminApi.allAssignments>>['assignments']>(
    []
  );
  const [dirError, setDirError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setDirError(null);
    try {
      const [d, a] = await Promise.all([
        authedFetch((t) => adminApi.pendingDoctors(t)),
        authedFetch((t) => adminApi.listAssignments(t, 'PENDING')),
      ]);
      setDoctors(d.doctors);
      setAssignments(a.assignments);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load the review queue.');
    }
    // The directories are separate: if they fail, the review queue still works.
    try {
      const [p, dr, c] = await Promise.all([
        authedFetch((t) => adminApi.listAllPatients(t)),
        authedFetch((t) => adminApi.listAllDoctors(t)),
        authedFetch((t) => adminApi.allAssignments(t)),
      ]);
      setAllPatients(p.patients);
      setAllDoctors(dr.doctors);
      setConnections(c.assignments);
    } catch (e) {
      setDirError(e instanceof ApiError ? e.message : 'Could not load members and specialists.');
    }
    setLoading(false);
  }, [authedFetch]);

  const connectedCount = connections.filter((c) => c.status === 'ACTIVE' && c.doctor_accepted_at).length;
  const reviewCount = doctors.length + assignments.length;

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
        <Text variant="display">Admin</Text>
        <Text variant="body" color="textMuted">
          Approvals, who is connected to whom, and how every member is doing.
        </Text>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        <StatTile value={loading ? '…' : String(allPatients.length)} label="Members" />
        <StatTile value={loading ? '…' : String(allDoctors.length)} label="Specialists" />
        <StatTile value={loading ? '…' : String(connectedCount)} label="Connected" />
        <StatTile value={loading ? '…' : String(reviewCount)} label="To review" />
      </View>

      <SegmentTabs
        tabs={[
          { value: 'review', label: reviewCount ? `Review (${reviewCount})` : 'Review' },
          { value: 'connections', label: 'Connections' },
          { value: 'patients', label: 'Members' },
          { value: 'doctors', label: 'Specialists' },
        ]}
        value={section}
        onChange={setSection}
      />

      {error && <Banner tone="error">{error}</Banner>}
      {section !== 'review' && dirError && <Banner tone="error">{dirError}</Banner>}

      {section !== 'review' &&
        (loading ? (
          <SkeletonList count={3} lines={3} />
        ) : section === 'connections' ? (
          <ConnectionsPanel rows={connections} />
        ) : section === 'patients' ? (
          <PatientsPanel patients={allPatients} />
        ) : (
          <DoctorsPanel doctors={allDoctors} />
        ))}

      {section === 'review' && (
        <>
          {/* ------------------------------ doctors ------------------------------ */}

          <SectionTitle icon="medkit-outline" title={`Specialist applications (${doctors.length})`} />

          {loading ? (
            <SkeletonList count={2} lines={3} />
          ) : doctors.length === 0 ? (
            <Card>
              <Text variant="body" color="textMuted">
                Nothing waiting. New specialist registrations appear here.
              </Text>
            </Card>
          ) : (
            doctors.map((doctor) => (
              <Card key={doctor.id} style={{ gap: space.md }}>
                <View style={{ gap: 2 }}>
                  <Text variant="heading">{doctor.name}</Text>
                  <Text variant="caption" color="textMuted">
                    {doctor.email} · applied {formatDate(doctor.created_at)}
                  </Text>
                </View>

                {/* The three fields an admin is actually deciding on. They are
                self-reported and unverified — that is the whole point of the
                review, so they are shown plainly rather than dressed up. */}
                <View style={{ gap: space.xs }}>
                  <InfoRow label="Specialty" value={doctor.specialty} />
                  <InfoRow label="Registration ID" value={doctor.license_number} />
                  {doctor.bio ? <InfoRow label="Bio" value={doctor.bio} /> : null}
                  <InfoRow label="Email confirmed" value={doctor.email_verified_at ? 'Yes' : 'Not yet'} />
                </View>

                <Banner tone="warning">
                  Check the registration ID before approving.
                </Banner>

                {doctor.email_verified_at ? (
                  <View style={{ flexDirection: 'row', gap: space.sm }}>
                    <Button
                      label={busy === doctor.id ? 'Working…' : 'Approve'}
                      icon="checkmark"
                      busy={busy === doctor.id}
                      disabled={busy !== null && busy !== doctor.id}
                      onPress={() => act(doctor.id, () => authedFetch((t) => adminApi.approveDoctor(t, doctor.id)))}
                      style={{ flex: 1 }}
                    />
                    <Button
                      label="Reject"
                      variant="secondary"
                      disabled={busy !== null}
                      onPress={() => act(doctor.id, () => authedFetch((t) => adminApi.disableUser(t, doctor.id)))}
                      style={{ flex: 1 }}
                    />
                  </View>
                ) : (
                  // The server refuses to approve an unconfirmed email, so the
                  // button is not offered rather than offered and then failing.
                  <Banner tone="info" icon="mail-unread-outline">
                    Cannot be approved until they confirm their email address.
                  </Banner>
                )}
              </Card>
            ))
          )}

          {/* ---------------------------- assignments ---------------------------- */}

          <SectionTitle icon="people-outline" title={`Member assignments (${assignments.length})`} />

          {loading ? null : assignments.length === 0 ? (
            <Card>
              <Text variant="body" color="textMuted">
                Nothing waiting. Requests appear here when a member asks to be connected to a specialist.
              </Text>
            </Card>
          ) : (
            assignments.map((a) => (
              <Card key={a.id} style={{ gap: space.md }}>
                <View style={{ gap: space.sm }}>
                  <PersonRow icon="person-outline" role="Patient" name={a.patient_name} />
                  <PersonRow icon="medkit-outline" role="Doctor" name={a.doctor_name} />
                </View>
                <Text variant="caption" color="textMuted">
                  Requested {formatDate(a.requested_at)}. Approving lets this specialist read this member’s results.
                </Text>

                <View style={{ flexDirection: 'row', gap: space.sm }}>
                  <Button
                    label={busy === a.id ? 'Working…' : 'Approve'}
                    icon="checkmark"
                    busy={busy === a.id}
                    disabled={busy !== null && busy !== a.id}
                    onPress={() => act(a.id, () => authedFetch((t) => adminApi.approveAssignment(t, a.id)))}
                    style={{ flex: 1 }}
                  />
                  <Button
                    label="Reject"
                    variant="secondary"
                    disabled={busy !== null}
                    onPress={() => act(a.id, () => authedFetch((t) => adminApi.rejectAssignment(t, a.id)))}
                    style={{ flex: 1 }}
                  />
                </View>
              </Card>
            ))
          )}
        </>
      )}

      <Button label="Refresh" variant="quiet" icon="refresh" onPress={load} />
    </Screen>
  );
}

function SectionTitle({ icon, title }: { icon: keyof typeof Ionicons.glyphMap; title: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.sm }}>
      <Ionicons name={icon} size={24} color={colors.accent} />
      <Text variant="heading">{title}</Text>
    </View>
  );
}

function PersonRow({ icon, role, name }: { icon: keyof typeof Ionicons.glyphMap; role: string; name: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
      <Ionicons name={icon} size={22} color={colors.textMuted} />
      <Text variant="caption" color="textMuted" style={{ width: 64 }}>
        {role}
      </Text>
      <Text variant="label" style={{ flex: 1 }}>
        {name}
      </Text>
    </View>
  );
}
