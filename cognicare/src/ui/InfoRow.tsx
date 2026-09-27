import { View } from 'react-native';

import { space } from '@/theme/tokens';
import { Text } from './Text';

/** A label and its value on one line, wrapping cleanly when the value is long. */
export function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.md }}>
      <Text variant="body" color="textMuted">
        {label}
      </Text>
      <Text variant="label" style={{ flexShrink: 1, textAlign: 'right' }}>
        {value}
      </Text>
    </View>
  );
}
