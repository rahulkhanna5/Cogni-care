import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { connectionLabel, type allAssignments } from '@/api/admin.api';
import { colors, space } from '@/theme/tokens';
import { Card, Text } from '@/ui';
import { day } from './format';
import { StatusPill } from './StatusPill';

type Row = Awaited<ReturnType<typeof allAssignments>>['assignments'][number];

const GROUPS: { title: string; match: (r: Row) => boolean }[] = [
  { title: 'Waiting for you', match: (r) => r.status === 'PENDING' },
  { title: 'Waiting for the specialist', match: (r) => r.status === 'ACTIVE' && !r.doctor_accepted_at },
  { title: 'Connected', match: (r) => r.status === 'ACTIVE' && !!r.doctor_accepted_at },
  { title: 'Ended', match: (r) => r.status === 'REJECTED' || r.status === 'REVOKED' },
];

/** Which patient is connected to which doctor, grouped by where it stands. */
export function ConnectionsPanel({ rows }: { rows: Row[] }) {
  const router = useRouter();
  if (rows.length === 0) {
    return (
      <Card>
        <Text variant="body" color="textMuted">
          No member has asked for a specialist yet.
        </Text>
      </Card>
    );
  }
  return (
    <View style={{ gap: space.lg }}>
      {GROUPS.map((g) => {
        const list = rows.filter(g.match);
        if (list.length === 0) return null;
        return (
          <View key={g.title} style={{ gap: space.sm }}>
            <Text variant="heading">{`${g.title} (${list.length})`}</Text>
            {list.map((r) => (
              <Card
                key={r.id}
                style={{ gap: space.sm }}
                accessibilityLabel={`${r.patient_name} with ${r.doctor_name}: ${connectionLabel(r).text}`}
                onPress={() => router.push({ pathname: '/patient/[id]', params: { id: r.patient_id } })}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' }}>
                  <Ionicons name="person-outline" size={20} color={colors.textMuted} />
                  <Text variant="label">{r.patient_name}</Text>
                  <Ionicons name="arrow-forward" size={18} color={colors.textMuted} />
                  <Ionicons name="medkit-outline" size={20} color={colors.textMuted} />
                  <Text variant="label">{r.doctor_name}</Text>
                </View>
                <StatusPill status={r.status} doctor_accepted_at={r.doctor_accepted_at} />
                <Text variant="caption" color="textMuted">
                  {[
                    `Asked ${day(r.requested_at)}`,
                    r.approved_at ? `approved ${day(r.approved_at)}` : null,
                    r.doctor_accepted_at ? `specialist accepted ${day(r.doctor_accepted_at)}` : null,
                    r.revoked_at ? `ended ${day(r.revoked_at)}` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </Card>
            ))}
          </View>
        );
      })}
    </View>
  );
}
