import { View } from 'react-native';

import { DOMAIN_LABELS } from '@/db/types';
import { space } from '@/theme/tokens';
import { Card, Screen, Text } from '@/ui';

export default function Assess() {
  return (
    <Screen>
      <View style={{ gap: space.xs, marginTop: space.sm }}>
        <Text variant="display">Check-in</Text>
        <Text variant="body" color="textMuted">
          25 short questions about how things have felt lately. There are no wrong
          answers.
        </Text>
      </View>

      <Card>
        <Text variant="heading">Five areas</Text>
        {Object.values(DOMAIN_LABELS).map((label) => (
          <Text key={label} variant="body" color="textMuted">
            • {label}
          </Text>
        ))}
        <Text variant="caption" color="textMuted">
          Coming in a later phase.
        </Text>
      </Card>
    </Screen>
  );
}
