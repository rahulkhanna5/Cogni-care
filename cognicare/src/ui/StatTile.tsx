import { View } from 'react-native';

import { colors, radius, space } from '@/theme/tokens';
import { SurfaceProvider } from './surface';
import { Text } from './Text';

type Props = {
  value: string;
  label: string;
  /** `raised` when the tile sits inside a card, so it still stands apart. */
  tone?: 'surface' | 'raised';
};

/** A headline number. Stat tiles, not charts — a one-bar chart of a single
 *  value is harder to read than the number itself. */
export function StatTile({ value, label, tone = 'surface' }: Props) {
  return (
    <SurfaceProvider value={tone}>
      <View
        accessible
        accessibilityLabel={`${label}: ${value}`}
        style={{
          flex: 1,
          backgroundColor: tone === 'raised' ? colors.surfaceRaised : colors.surface,
          borderRadius: radius.md,
          padding: space.md,
          gap: 2,
        }}
      >
        <Text variant="display">{value}</Text>
        <Text variant="caption" color="textMuted">
          {label}
        </Text>
      </View>
    </SurfaceProvider>
  );
}
