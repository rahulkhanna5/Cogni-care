import { View } from 'react-native';
import Svg, { Circle, Line, Rect } from 'react-native-svg';

import { space } from '@/theme/tokens';
import { Text } from '@/ui';
import { chart, mark } from './colors';

export type DumbbellRow = {
  label: string;
  /** Earlier value, omitted when there is nothing to compare against. */
  before?: number;
  now: number;
};

type Props = {
  rows: DumbbellRow[];
  max: number;
  width: number;
};

/**
 * Before → after, one row per item. Chosen over a radar: a radar distorts
 * area, makes five values hard to read individually, and is markedly harder
 * for this audience than a straight track with the numbers printed on it.
 */
export function Dumbbell({ rows, max, width }: Props) {
  const rowHeight = 34;
  const plotWidth = Math.max(40, width - 8);

  return (
    <View style={{ gap: space.md }}>
      {rows.map((row) => {
        const nowX = (row.now / max) * plotWidth;
        const beforeX = row.before != null ? (row.before / max) * plotWidth : null;
        const delta = row.before != null ? row.now - row.before : null;

        return (
          <View key={row.label} style={{ gap: 2 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text variant="body">{row.label}</Text>
              <Text variant="label">
                {row.now} / {max}
              </Text>
            </View>

            <Svg width={plotWidth + 8} height={rowHeight}>
              <Rect
                x={4}
                y={rowHeight / 2 - mark.trackHeight / 2}
                width={plotWidth}
                height={mark.trackHeight}
                rx={mark.radius}
                fill={chart.track}
              />

              {beforeX != null && (
                <Line
                  x1={Math.min(beforeX, nowX) + 4}
                  y1={rowHeight / 2}
                  x2={Math.max(beforeX, nowX) + 4}
                  y2={rowHeight / 2}
                  stroke={chart.before}
                  strokeWidth={mark.lineWidth + 2}
                  strokeLinecap="round"
                />
              )}

              {beforeX != null && (
                <Circle
                  cx={beforeX + 4}
                  cy={rowHeight / 2}
                  r={mark.dot / 2}
                  fill={chart.before}
                  // A 2px surface ring keeps the two dots readable when a
                  // score has not moved and they sit on top of each other.
                  stroke={chart.ring}
                  strokeWidth={2}
                />
              )}

              <Circle
                cx={nowX + 4}
                cy={rowHeight / 2}
                r={mark.dot / 2 + 1}
                fill={chart.now}
                stroke={chart.ring}
                strokeWidth={2}
              />
            </Svg>

            {delta != null && delta !== 0 && (
              <Text variant="caption" color="textMuted">
                {delta < 0 ? `${Math.abs(delta)} lower than last time` : `${delta} higher than last time`}
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );
}
