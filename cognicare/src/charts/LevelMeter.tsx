import { View } from 'react-native';

import { space } from '@/theme/tokens';
import { Text } from '@/ui';
import { chart, mark } from './colors';

type Props = {
  level: number;
  /** The game's own maximum — Blink Trail stops at 8, Daily Order at 10, the others at 15. */
  max: number;
  /** Game name shown on the left of the header row. */
  title?: string;
};

/**
 * One segment per level. Reached levels are filled, the rest are outlined —
 * a difference of shape, not only colour.
 */
export function LevelMeter({ level, max, title }: Props) {
  const reached = Math.max(0, Math.min(level, max));

  return (
    <View
      accessible
      accessibilityLabel={`${title ? `${title}, ` : ''}level ${reached} of ${max}`}
      style={{ gap: space.sm }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.md }}>
        {title ? <Text variant="label">{title}</Text> : <View />}
        <Text variant="label" color="accent">
          Level {reached} of {max}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 4 }}>
        {Array.from({ length: max }).map((_, i) => {
          const filled = i < reached;
          return (
            <View
              key={i}
              style={{
                flex: 1,
                height: mark.trackHeight,
                borderRadius: 4,
                backgroundColor: filled ? chart.game : 'transparent',
                borderWidth: filled ? 0 : 1.5,
                borderColor: chart.outline,
              }}
            />
          );
        })}
      </View>
    </View>
  );
}
