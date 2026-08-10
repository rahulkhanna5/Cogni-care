import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';

import { bandInfo } from '@/assessment/scoring';
import { Dumbbell, type DumbbellRow } from '@/charts/Dumbbell';
import { chart } from '@/charts/colors';
import { Meter } from '@/charts/Meter';
import { Sparkline } from '@/charts/Sparkline';
import { assessmentHistory } from '@/db/queries';
import { accuracyTrend, gameSummaries, todayStats, type GameSummary, type TodayStats } from '@/db/stats';
import { DOMAIN_LABELS, type Assessment, type Domain } from '@/db/types';
import { GAMES, getGame } from '@/games/registry';
import { useSession } from '@/store/session';
import { colors, radius, space } from '@/theme/tokens';
import { Button, Card, Screen, Text } from '@/ui';

const MAX_LEVEL = 15; // every game currently ships 15 levels

export default function Dashboard() {
  const db = useSQLiteContext();
  const router = useRouter();
  const player = useSession((s) => s.player);
  const { width } = useWindowDimensions();

  const [stats, setStats] = useState<TodayStats | null>(null);
  const [summaries, setSummaries] = useState<GameSummary[]>([]);
  const [trends, setTrends] = useState<Record<string, number[]>>({});
  const [assessments, setAssessments] = useState<Assessment[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (!player) return;
      let cancelled = false;

      (async () => {
        const [today, games, checkins] = await Promise.all([
          todayStats(db, player.id),
          gameSummaries(db, player.id),
          assessmentHistory(db, player.id, 2),
        ]);
        if (cancelled) return;

        setStats(today);
        setSummaries(games);
        setAssessments(checkins);

        const played = games.filter((g) => g.plays > 0);
        const series = await Promise.all(
          played.map((g) => accuracyTrend(db, player.id, g.game_id))
        );
        if (cancelled) return;
        setTrends(Object.fromEntries(played.map((g, i) => [g.game_id, series[i]])));
      })();

      return () => {
        cancelled = true;
      };
    }, [db, player])
  );

  const cardWidth = Math.min(width, 520) - space.lg * 2 - space.lg * 2;
  const latest = assessments[0];
  const previous = assessments[1];
  const playedGames = summaries.filter((g) => g.plays > 0);
  const nextGame = suggestNext(summaries);

  const domainRows: DumbbellRow[] = latest
    ? (Object.keys(DOMAIN_LABELS) as Domain[]).map((domain) => ({
        label: DOMAIN_LABELS[domain],
        now: latest[domain],
        before: previous ? previous[domain] : undefined,
      }))
    : [];

  return (
    <Screen>
      <View style={{ gap: space.xs, marginTop: space.sm }}>
        <Text variant="display">Hello, {player?.name ?? 'there'}</Text>
      </View>

      {/* Headline numbers are stat tiles, not charts — a one-bar chart of a
          single value is harder to read than the number itself. */}
      <View style={{ flexDirection: 'row', gap: space.md }}>
        <Stat label="Day streak" value={String(stats?.streak ?? 0)} />
        <Stat label="Today" value={String(stats?.sessionsToday ?? 0)} />
        <Stat label="This week" value={String(stats?.sessionsThisWeek ?? 0)} />
      </View>

      {nextGame && (
        <Card>
          <Text variant="heading">Suggested next</Text>
          <Text variant="body" color="textMuted">
            {nextGame.title} — {nextGame.blurb}
          </Text>
          <Button label={`Play ${nextGame.title}`} onPress={() => router.push(`/game/${nextGame.id}`)} />
        </Card>
      )}

      {/* Panel 1 of 2. Kept separate from the questionnaire panel on purpose:
          the games and the check-in do not measure the same things, and one
          combined "improvement" figure would imply a link the data cannot
          support. See ARCHITECTURE.md §3. */}
      <Card>
        <Text variant="heading">Trained</Text>
        <Text variant="body" color="textMuted">
          How you are doing in the games. Higher is better.
        </Text>

        {playedGames.length === 0 ? (
          <Text variant="body" color="textMuted">
            No games played yet. Your progress will show up here.
          </Text>
        ) : (
          <View style={{ gap: space.lg, marginTop: space.sm }}>
            {playedGames.map((summary) => {
              const meta = getGame(summary.game_id);
              const series = trends[summary.game_id] ?? [];
              return (
                <View key={summary.game_id} style={{ gap: space.xs }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text variant="label">{meta?.title ?? summary.game_id}</Text>
                    <Text variant="body" color="textMuted">
                      Level {summary.current_level}
                    </Text>
                  </View>

                  <Meter value={summary.current_level} max={MAX_LEVEL} width={cardWidth} />

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                    <Sparkline values={series} width={cardWidth - 90} />
                    <Text variant="body">{Math.round(summary.mean_accuracy * 100)}%</Text>
                  </View>

                  <Text variant="caption" color="textMuted">
                    {summary.plays} {summary.plays === 1 ? 'session' : 'sessions'} · best {summary.best_score}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </Card>

      {/* Panel 2 of 2. */}
      <Card>
        <Text variant="heading">Self-reported</Text>
        <Text variant="body" color="textMuted">
          Your check-in answers. Lower is better here.
        </Text>

        {!latest ? (
          <>
            <Text variant="body" color="textMuted">
              No check-in yet.
            </Text>
            <Button label="Take the check-in" variant="secondary" onPress={() => router.push('/assessment')} />
          </>
        ) : (
          <View style={{ gap: space.md, marginTop: space.sm }}>
            <View>
              <Text variant="display">{latest.total_score} / 100</Text>
              <Text variant="heading" color="accent">
                {bandInfo(latest.band).label}
              </Text>
            </View>

            <Dumbbell rows={domainRows} max={20} width={cardWidth} />

            {previous && (
              <View style={{ flexDirection: 'row', gap: space.lg, flexWrap: 'wrap' }}>
                <Key color={chart.before} label="Previous check-in" />
                <Key color={chart.now} label="Latest check-in" />
              </View>
            )}
          </View>
        )}
      </Card>
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        padding: space.md,
        gap: 2,
      }}
    >
      <Text variant="display">{value}</Text>
      <Text variant="caption" color="textMuted">
        {label}
      </Text>
    </View>
  );
}

/** Legend. Two series means a legend is always present, never colour alone. */
function Key({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
      <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: color }} />
      <Text variant="caption" color="textMuted">
        {label}
      </Text>
    </View>
  );
}

/**
 * Least-recently-played game that is ready, so a session rotates across
 * domains over a week instead of drilling one game.
 */
function suggestNext(summaries: GameSummary[]) {
  const ready = GAMES.filter((g) => g.ready);
  const playedAt = new Map(summaries.map((s) => [s.game_id, s.last_played_at ?? '']));
  const sorted = [...ready].sort(
    (a, b) => (playedAt.get(a.id) ?? '').localeCompare(playedAt.get(b.id) ?? '')
  );
  return sorted[0];
}
