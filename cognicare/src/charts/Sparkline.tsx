import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';

import { colors, space } from '@/theme/tokens';
import { Text, useSurface } from '@/ui';
import { chart, mark } from './colors';

type Props = {
  /** Oldest → newest, each 0..1. */
  values: number[];
  height?: number;
};

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);

/**
 * Accuracy across recent sessions, in coral (a game chart). A dashed line
 * marks the average and the ends are labelled oldest / latest, because a
 * mobile chart has no hover layer to fall back on.
 */
export function Sparkline({ values, height = 44 }: Props) {
  const [width, setWidth] = useState(0);
  const surface = useSurface();
  const backing =
    surface === 'raised' ? colors.surfaceRaised : surface === 'bg' ? colors.bg : colors.surface;

  const avg = mean(values);
  const pad = mark.dot / 2 + 3;
  const plotH = height - pad * 2;
  const y = (v: number) => pad + (1 - Math.max(0, Math.min(1, v))) * plotH;

  const n = values.length;
  const step = n > 1 ? (width - pad * 2) / (n - 1) : 0;
  const x = (i: number) => (n > 1 ? pad + i * step : width / 2);

  return (
    <View
      style={{ gap: 2 }}
      accessible
      accessibilityLabel={
        n === 0
          ? 'No sessions yet'
          : `Accuracy over the last ${n} ${n === 1 ? 'session' : 'sessions'}, average ${Math.round(avg * 100)} percent`
      }
    >
      <View style={{ height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 && n > 0 && (
          <Svg width={width} height={height}>
            {/* Fixed 0..1 domain. Rescaling to the data would make a flat run
                of 88% look like wild swings. */}
            <Line
              x1={pad}
              x2={width - pad}
              y1={y(avg)}
              y2={y(avg)}
              stroke={chart.axis}
              strokeWidth={1.5}
              strokeDasharray="5 5"
            />
            {n > 1 && (
              <Polyline
                points={values.map((v, i) => `${x(i)},${y(v)}`).join(' ')}
                fill="none"
                stroke={chart.game}
                strokeWidth={mark.lineWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
            {values.map((v, i) => {
              const last = i === n - 1;
              return (
                <Circle
                  key={i}
                  cx={x(i)}
                  cy={y(v)}
                  r={last ? mark.dot / 2 + 2 : mark.dot / 2 - 1}
                  fill={chart.game}
                  stroke={backing}
                  strokeWidth={last ? 2 : 0}
                />
              );
            })}
          </Svg>
        )}
      </View>

      {n > 1 && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: space.xs }}>
          <Text variant="caption" color="textMuted">
            oldest
          </Text>
          <Text variant="caption" color="textMuted">
            latest
          </Text>
        </View>
      )}
    </View>
  );
}

export const averageOf = mean;
