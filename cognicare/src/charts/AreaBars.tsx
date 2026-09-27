import { View } from 'react-native';

import { space } from '@/theme/tokens';
import { Text } from '@/ui';
import { chart, mark } from './colors';

export type AreaBarRow = { label: string; value: number };

type Props = {
  rows: AreaBarRow[];
  max: number;
};

/**
 * Check-in areas, 0–20 each. Warm sand, never coral — keeps them visually
 * apart from game results, whose direction is the opposite.
 */
export function AreaBars({ rows, max }: Props) {
  return (
    <View style={{ gap: space.md }}>
      {rows.map((row) => {
        const share = Math.max(0, Math.min(1, row.value / max));
        return (
          <View
            key={row.label}
            accessible
            accessibilityLabel={`${row.label}: ${row.value} out of ${max}`}
            style={{ gap: space.xs }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.md }}>
              <Text variant="label" style={{ flexShrink: 1 }}>
                {row.label}
              </Text>
              <Text variant="label">
                {row.value} / {max}
              </Text>
            </View>
            <View
              style={{
                height: mark.trackHeight + 3,
                borderRadius: 999,
                borderWidth: 1.5,
                borderColor: chart.outline,
                overflow: 'hidden',
              }}
            >
              <View style={{ width: `${share * 100}%`, height: '100%', backgroundColor: chart.checkin }} />
            </View>
          </View>
        );
      })}
    </View>
  );
}
