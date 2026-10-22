import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import * as adminApi from '@/api/admin.api';
import { ApiError } from '@/api/client';
import { ago, cap, day, pct } from '@/admin/format';
import { StatusPill } from '@/admin/StatusPill';
import { doctorCsv, doctorReportHtml } from '@/care/report/build';
import { ReviewList } from '@/care/doctor/MyReviews';
import { ExportButtons } from '@/care/report/ExportButtons';
import { fileName, saveCsv, savePdf } from '@/care/report/share';
import { useAuth } from '@/store/auth';
import { space } from '@/theme/tokens';
import { Banner, Card, InfoRow, Screen, ScreenHeader, SkeletonList, StatTile, Text } from '@/ui';

/**
 * One doctor, for the admin: their registration, and every patient they are or
 * were connected to with how each is doing. Export takes the same table away.
 */
export default function AdminDoctor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { authedFetch } = useAuth();
  const [data, setData] = useState<adminApi.AdminDoctorDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    authedFetch((t) => adminApi.getDoctor(t, id))
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(e instanceof ApiError ? e.message : 'Could not load this specialist.'));
    return () => {
      cancelled = true;
    };
  }, [id, authedFetch]);

  if (error) {
    return (
      <Screen>
        <ScreenHeader title="Specialist" onBack={() => router.back()} />
        <Banner tone="error">{error}</Banner>
      </Screen>
    );
  }
  if (!data) {
    return (
      <Screen>
        <ScreenHeader title="Specialist" onBack={() => router.back()} />
        <SkeletonList count={3} lines={3} />
      </Screen>
    );
  }

  const { doctor, patients } = data;
  const connected = patients.filter((p) => p.status === 'ACTIVE' && p.doctor_accepted_at);
  const waiting = patients.filter((p) => p.status === 'PENDING' || (p.status === 'ACTIVE' && !p.doctor_accepted_at));

  return (
    <Screen>
      <ScreenHeader title={doctor.name} onBack={() => router.back()} />

      <Card style={{ gap: space.xs }}>
        <InfoRow label="Specialty" value={doctor.specialty ?? '—'} />
        <InfoRow label="Registration no." value={doctor.license_number ?? '—'} />
        <InfoRow label="Email" value={doctor.email} />
        <InfoRow label="Joined" value={day(doctor.created_at)} />
        <InfoRow
          label="Status"
          value={
            !doctor.is_active
              ? 'Disabled'
              : doctor.approved_at
                ? `Approved ${day(doctor.approved_at)}`
                : 'Waiting for approval'
          }
        />
        {doctor.bio ? <InfoRow label="Bio" value={doctor.bio} /> : null}
      </Card>

      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <StatTile value={String(connected.length)} label="Patients" />
        <StatTile value={String(waiting.length)} label="Waiting" />
        <StatTile value={String(patients.reduce((a, p) => a + p.remarks, 0))} label="Notes written" />
      </View>

      <ExportButtons
        onPdf={() => savePdf(doctorReportHtml(data))}
        onCsv={() => saveCsv(fileName(doctor.name, 'csv'), doctorCsv(data))}
      />

      <Card style={{ gap: space.md }}>
        <Text variant="heading">Ratings from patients</Text>
        <ReviewList reviews={data.reviews ?? []} />
      </Card>

      <Text variant="heading">Patients</Text>
      {patients.length === 0 ? (
        <Card>
          <Text variant="body" color="textMuted">
            No patient has asked this specialist yet.
          </Text>
        </Card>
      ) : (
        patients.map((p) => (
          <Card
            key={p.assignment_id}
            style={{ gap: space.sm }}
            accessibilityLabel={`${p.patient_name}. Open details`}
            onPress={() => router.push({ pathname: '/patient/[id]', params: { id: p.patient_id } })}
          >
            <View style={{ gap: 2 }}>
              <Text variant="heading">{p.patient_name}</Text>
              <Text variant="caption" color="textMuted">
                {p.patient_email}
              </Text>
            </View>
            <StatusPill status={p.status} doctor_accepted_at={p.doctor_accepted_at} />
            <View style={{ gap: 2 }}>
              <InfoRow label="Asked" value={day(p.requested_at)} />
              <InfoRow label="Last played" value={cap(ago(p.last_played_at))} />
              <InfoRow label="Sessions" value={String(p.sessions)} />
              <InfoRow label="Right, last 30 days" value={pct(p.accuracy_30d)} />
              <InfoRow
                label="Latest check-in"
                value={p.latest_score == null ? 'None yet' : `${p.latest_score}/100 · ${cap(p.latest_band)}`}
              />
              <InfoRow label="Notes by this specialist" value={String(p.remarks)} />
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}
