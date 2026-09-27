import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';

import { colors, space } from '@/theme/tokens';
import { Text, useSurface } from '@/ui';
import { chart } from './colors';

export type DumbbellRow = {
  label: string;
  /** Earlier value, omitted when there is nothing to compare against. */
  before?: number;
  now: number;
};

type Props = {
  rows: DumbbellRow[];
  max: number;
  /** Legend wording, e.g. "Previous (11 Aug 2026)". */
  beforeLabel?: string;
  nowLabel?: string;
};

const RING = 8;

/**
 * Previous → latest check-in, one row per area. Previous is a hollow ring,
 * latest a solid sand dot — they differ by shape, so colour vision never
 * decides which is which. The change is also spelled out in words on every
 * row, because the direction (lower is better) is the easiest thing here to
 * misread. Chosen over a radar, which distorts area and makes five values
 * hard to read one by one.
 */
export function Dumbbell({
  rows,
  max,
  beforeLabel = 'Previous check-in',
  nowLabel = 'Latest check-in',
}: Props) {
  const [width, setWidth] = useState(0);
  const surface = useSurface();
  const backing = surface === 'raised' ? colors.surfaceRaised : colors.surface;
  const hasBefore = rows.some((r) => r.before != null);

  const plot = Math.max(0, width - RING * 2 - 4);
  const at = (v: number) => RING + 2 + (Math.max(0, Math.min(max, v)) / max) * plot;
  const rowH = RING * 2 + 8;

  return (
    <View style={{ gap: space.md }}>
      {hasBefore && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.lg }}>
          <Key hollow label={beforeLabel} />
          <Key label={nowLabel} />
        </View>
      )}

      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ gap: space.md }}>
        {rows.map((row) => {
          const delta = row.before != null ? row.now - row.before : null;
          const change =
            delta == null
              ? null
              : delta === 0
                ? 'same'
                : delta < 0
                  ? `${Math.abs(delta)} lower`
                  : `${delta} higher`;

          return (
            <View
              key={row.label}
              accessible
              accessibilityLabel={`${row.label}: ${row.now} out of ${max}${
                change ? `, ${change === 'same' ? 'the same as' : change + ' than'} last time` : ''
              }`}
              style={{ gap: 2 }}
            >
              {/* The value and its change are stacked on the right rather than
                  run together: with a long area name on a 360dp phone, "13 / 20
                  · 1 higher" broke across lines mid-phrase. */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.md }}>
                <Text variant="label" style={{ flex: 1 }}>
                  {row.label}
                </Text>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text variant="label" numberOfLines={1}>
                    {row.now} / {max}
                  </Text>
                  {change && (
                    <Text variant="caption" color={delta! < 0 ? 'success' : 'textMuted'} numberOfLines={1}>
                      {change}
                    </Text>
                  )}
                </View>
              </View>

              {width > 0 && (
                <Svg width={width} height={rowH}>
                  <Line
                    x1={RING}
                    x2={width - RING}
                    y1={rowH / 2}
                    y2={rowH / 2}
                    stroke={chart.track}
                    strokeWidth={2}
                    strokeLinecap="round"
                  />
                  {row.before != null && (
                    <Line
                      x1={at(Math.min(row.before, row.now))}
                      x2={at(Math.max(row.before, row.now))}
                      y1={rowH / 2}
                      y2={rowH / 2}
                      stroke={chart.checkin}
                      strokeWidth={3}
                      strokeLinecap="round"
                    />
                  )}
                  {row.before != null && (
                    <Circle
                      cx={at(row.before)}
                      cy={rowH / 2}
                      r={RING - 1}
                      fill={backing}
                      stroke={colors.text}
                      strokeWidth={2.5}
                    />
                  )}
                  <Circle cx={at(row.now)} cy={rowH / 2} r={RING} fill={chart.checkin} />
                </Svg>
              )}
            </View>
          );
        })}
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text variant="caption" color="textMuted">
          0 · fewer difficulties
        </Text>
        <Text variant="caption" color="textMuted">
          {max}
        </Text>
      </View>
    </View>
  );
}

function Key({ label, hollow }: { label: string; hollow?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
      <View
        style={{
          width: 16,
          height: 16,
          borderRadius: 8,
          backgroundColor: hollow ? 'transparent' : chart.checkin,
          borderWidth: hollow ? 2.5 : 0,
          borderColor: colors.text,
        }}
      />
      <Text variant="caption" color="textMuted">
        {label}
      </Text>
    </View>
  );
}
