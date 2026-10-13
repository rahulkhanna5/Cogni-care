import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { View } from 'react-native';

import type { AdminDoctor } from '@/api/admin.api';
import { colors, space } from '@/theme/tokens';
import { Card, InfoRow, Text } from '@/ui';
import { day } from './format';

/** Every doctor, approved or not, with their patient numbers. */
export function DoctorsPanel({ doctors }: { doctors: AdminDoctor[] }) {
  const router = useRouter();
  if (doctors.length === 0) {
    return (
      <Card>
        <Text variant="body" color="textMuted">
          No doctor accounts yet.
        </Text>
      </Card>
    );
  }
  return (
    <View style={{ gap: space.md }}>
      {doctors.map((d) => (
        <Card
          key={d.id}
          style={{ gap: space.sm }}
          accessibilityLabel={`${d.name}. Open details`}
          onPress={() => router.push({ pathname: '/admin-doctor/[id]', params: { id: d.id } })}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="heading">{d.name}</Text>
              <Text variant="caption" color="textMuted">
                {`${d.specialty ?? 'No specialty given'} · ${d.email}`}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color={colors.textMuted} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
            <Ionicons
              name={!d.is_active ? 'close-circle' : d.approved_at ? 'checkmark-circle' : 'time-outline'}
              size={18}
              color={!d.is_active ? colors.danger : d.approved_at ? colors.success : colors.warning}
            />
            <Text variant="label" color={!d.is_active ? 'danger' : d.approved_at ? 'success' : 'warning'}>
              {!d.is_active ? 'Disabled' : d.approved_at ? `Approved ${day(d.approved_at)}` : 'Waiting for approval'}
            </Text>
          </View>
          <InfoRow label="Patients" value={String(d.patients)} />
          <InfoRow label="Requests waiting" value={String(d.waiting)} />
        </Card>
      ))}
    </View>
  );
}
