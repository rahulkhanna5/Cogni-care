import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import type { AdminPatient } from '@/api/admin.api';
import { space } from '@/theme/tokens';
import { Card, InfoRow, Text, TextField } from '@/ui';
import { ago, cap, pct } from './format';
import { StatusPill } from './StatusPill';

/**
 * Every patient: who they are connected to, and how they are doing. Tapping
 * one opens the same detail screen a doctor sees (games, check-ins, where they
 * get stuck, notes, export) — opened under the admin's own, logged access.
 */
export function PatientsPanel({ patients }: { patients: AdminPatient[] }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? patients.filter((p) => `${p.name} ${p.email}`.toLowerCase().includes(s)) : patients;
  }, [patients, q]);

  if (patients.length === 0) {
    return (
      <Card>
        <Text variant="body" color="textMuted">
          No patient accounts yet.
        </Text>
      </Card>
    );
  }

  return (
    <View style={{ gap: space.md }}>
      <TextField label="Find a patient" value={q} onChangeText={setQ} placeholder="Name or email" />
      {shown.length === 0 && (
        <Text variant="body" color="textMuted">
          No patient matches that.
        </Text>
      )}
      {shown.map((p) => (
        <Card
          key={p.id}
          style={{ gap: space.sm }}
          accessibilityLabel={`${p.name}. Open details`}
          onPress={() => router.push({ pathname: '/patient/[id]', params: { id: p.id } })}
        >
          <View style={{ gap: 2 }}>
            <Text variant="heading">{p.name}</Text>
            <Text variant="caption" color="textMuted">
              {p.email}
            </Text>
          </View>

          {p.doctors.length === 0 ? (
            <Text variant="body" color="textMuted">
              Not connected to a doctor
            </Text>
          ) : (
            p.doctors.map((d) => (
              <View
                key={d.assignment_id}
                style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, alignItems: 'center' }}
              >
                <Text variant="label">{d.doctor_name}</Text>
                <StatusPill status={d.status} doctor_accepted_at={d.doctor_accepted_at} />
              </View>
            ))
          )}

          <View style={{ gap: 2 }}>
            <InfoRow label="Last played" value={cap(ago(p.last_played_at))} />
            <InfoRow label="Sessions" value={String(p.sessions)} />
            <InfoRow label="Right, last 30 days" value={pct(p.accuracy_30d)} />
            <InfoRow
              label="Latest check-in"
              value={p.latest_score == null ? 'None yet' : `${p.latest_score}/100 · ${cap(p.latest_band)}`}
            />
          </View>
        </Card>
      ))}
    </View>
  );
}
