import { View } from 'react-native';

import { space } from '@/theme/tokens';
import { Text } from '@/ui';
import { chart } from './colors';

export type SessionPoint = { at: string; accuracy: number; level: number };

const PLOT = 110;
const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

/**
 * One bar per session, oldest on the left. The bar's height is the share of
 * answers that were right, written on top of it, with the date and level
 * underneath — so nothing has to be inferred from a line's shape. Guide lines
 * at 50% and 100% give the height a scale. Blue: a game chart (see colors.ts).
 */
export function SessionBars({ points }: { points: SessionPoint[] }) {
  if (points.length === 0) return null;
  const summary = points
    .map((p) => `${day(p.at)}, level ${p.level}, ${Math.round(p.accuracy * 100)}% right`)
    .join('; ');

  return (
    <View accessible accessibilityLabel={`Sessions, oldest first: ${summary}`} style={{ gap: space.xs }}>
      <Text variant="caption" color="textMuted">
        Each bar is one session. Taller means more answers right.
      </Text>

      <View style={{ flexDirection: 'row' }}>
        {/* Scale */}
        <View style={{ width: 40, height: PLOT, justifyContent: 'space-between', marginTop: 18 }}>
          {['100%', '50%', '0%'].map((l) => (
            <Text key={l} variant="caption" color="textMuted" style={{ fontSize: 11, lineHeight: 12, marginTop: -6 }}>
              {l}
            </Text>
          ))}
        </View>

        <View style={{ flex: 1 }}>
          {/* Guide lines behind the bars */}
          <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 18, height: PLOT }}>
            {[0, 0.5, 1].map((f) => (
              <View
                key={f}
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: f * PLOT,
                  borderTopWidth: 1,
                  borderColor: chart.track,
                  borderStyle: f === 1 ? 'solid' : 'dashed',
                }}
              />
            ))}
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
            {points.map((p, i) => {
              const levelChanged = i > 0 && p.level !== points[i - 1]!.level;
              return (
                <View key={`${p.at}-${i}`} style={{ flex: 1, alignItems: 'center', maxWidth: 56 }}>
                  <Text variant="caption" style={{ fontSize: 11, lineHeight: 18 }}>
                    {`${Math.round(p.accuracy * 100)}%`}
                  </Text>
                  <View style={{ height: PLOT, width: '70%', justifyContent: 'flex-end' }}>
                    <View
                      style={{
                        height: Math.max(3, p.accuracy * PLOT),
                        backgroundColor: chart.game,
                        borderTopLeftRadius: 4,
                        borderTopRightRadius: 4,
                      }}
                    />
                  </View>
                  <Text variant="caption" color="textMuted" style={{ fontSize: 10, lineHeight: 14 }} numberOfLines={1}>
                    {day(p.at)}
                  </Text>
                  <Text
                    variant="caption"
                    color={levelChanged ? 'accent' : 'textMuted'}
                    style={{ fontSize: 10, lineHeight: 14 }}
                  >
                    {`L${p.level}`}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
}
