import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';

import { LevelMeter } from '@/charts/LevelMeter';
import { SessionBars } from '@/charts/SessionBars';
import { getGame } from '@/games/registry';
import { colors, space } from '@/theme/tokens';
import { Card, Text } from '@/ui';
import type { GameTrend } from '../insight';
import { formatDate, pct } from './parts';

/** Points of accuracy that count as a real move, not noise. */
const MOVE = 0.03;

/** Direction of the latest sessions against the ones before them, or null. */
export function movement(t: GameTrend): { icon: 'trending-up' | 'trending-down' | 'remove'; words: string } | null {
  if (t.earlier === null) return null;
  const d = t.recent - t.earlier;
  if (d <= -MOVE) return { icon: 'trending-down', words: 'Down' };
  if (d >= MOVE) return { icon: 'trending-up', words: 'Up' };
  return { icon: 'remove', words: 'Steady' };
}

/**
 * One card per game played: level, accuracy over time with its date range,
 * and how the latest sessions compare with the ones before. Higher is better
 * here — the opposite of the check-in — and the heading says so.
 */
export function GamesPanel({ trends }: { trends: GameTrend[] }) {
  if (trends.length === 0) {
    return (
      <Card>
        <Text variant="heading">No sessions shared yet</Text>
        <Text variant="body" color="textMuted">
          Game results appear here once the patient has played and shared them.
        </Text>
      </Card>
    );
  }

  return (
    <View style={{ gap: space.md }}>
      <Text variant="body" color="textMuted">
        Accuracy in the exercises. Higher is better.
      </Text>
      {trends.map((t) => {
        const meta = getGame(t.gameId);
        const m = movement(t);
        return (
          <Card key={t.gameId} style={{ gap: space.md }}>
            <LevelMeter title={meta?.title ?? t.gameId} level={t.level} max={meta?.maxLevel ?? 15} />

            <SessionBars points={t.points} />

            {m && t.earlier !== null ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                <Ionicons
                  name={m.icon}
                  size={22}
                  color={
                    m.icon === 'trending-down' ? colors.danger : m.icon === 'trending-up' ? colors.success : colors.edge
                  }
                />
                <Text variant="body" style={{ flex: 1 }}>
                  {`${m.words}: last 3 sessions ${pct(t.recent)}, the 5 before ${pct(t.earlier)}`}
                </Text>
              </View>
            ) : (
              <Text variant="body" color="textMuted">
                {`${pct(t.meanAccuracy)} right on average. A trend shows after 5 sessions.`}
              </Text>
            )}

            <Text variant="caption" color="textMuted">
              {`${t.plays} ${t.plays === 1 ? 'session' : 'sessions'}`}
              {t.meanReactionMs != null ? ` · ${t.meanReactionMs} ms average reaction` : ''}
              {` · last played ${formatDate(t.lastAt)}`}
            </Text>
          </Card>
        );
      })}
    </View>
  );
}
