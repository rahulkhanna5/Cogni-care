import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';

import { connectionLabel, type ConnectionStatus } from '@/api/admin.api';
import { colors, space } from '@/theme/tokens';
import { Text } from '@/ui';

const ICON = { success: 'checkmark-circle', warning: 'time-outline', muted: 'remove-circle-outline' } as const;
const MARKOf = () => ({ success: colors.success, warning: colors.warning, muted: colors.edge });

/** Where a connection stands: an icon AND words, never colour alone. */
export function StatusPill({
  status,
  doctor_accepted_at,
}: {
  status: ConnectionStatus;
  doctor_accepted_at?: string | null;
}) {
  const l = connectionLabel({ status, doctor_accepted_at });
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
      <Ionicons name={ICON[l.tone]} size={18} color={MARKOf()[l.tone]} />
      <Text variant="label" color={l.tone === 'muted' ? 'textMuted' : l.tone}>
        {l.text}
      </Text>
    </View>
  );
}
