import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { bandInfo } from '@/assessment/scoring';
import { Dumbbell, type DumbbellRow } from '@/charts/Dumbbell';
import { LevelMeter } from '@/charts/LevelMeter';
import { Sparkline } from '@/charts/Sparkline';
import { assessmentHistory } from '@/db/queries';
import { accuracyTrend, gameSummaries, todayStats, type GameSummary, type TodayStats } from '@/db/stats';
import { DOMAIN_LABELS, type Assessment, type Domain } from '@/db/types';
import { GAMES, getGame } from '@/games/registry';
import { useAuth } from '@/store/auth';
import { useSession } from '@/store/session';
import { space } from '@/theme/tokens';
import { Button, Card, Score, Screen, StatTile, Text } from '@/ui';

export default function Dashboard() {
  const db = useSQLiteContext();
  const router = useRouter();
  const player = useSession((s) => s.player);
  const accountName = useAuth((s) => s.user?.name);

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

  const latest = assessments[0];
  const previous = assessments[1];
  const playedGames = summaries.filter((g) => g.plays > 0);
  const nextGame = suggestNext(summaries);
  const name = player?.name ?? accountName?.split(' ')[0];

  const domainRows: DumbbellRow[] = latest
    ? (Object.keys(DOMAIN_LABELS) as Domain[]).map((domain) => ({
        label: DOMAIN_LABELS[domain],
        now: latest[domain],
        before: previous ? previous[domain] : undefined,
      }))
    : [];

  return (
    <Screen>
      <Text variant="display" style={{ marginTop: space.sm }}>
        {name ? `Hello, ${name}` : 'Hello'}
      </Text>

      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <StatTile value={String(stats?.streak ?? 0)} label="Day streak" />
        <StatTile value={String(stats?.sessionsToday ?? 0)} label="Today" />
        <StatTile value={String(stats?.sessionsThisWeek ?? 0)} label="This week" />
      </View>

      {/* The one soft light on the page: what to do next. */}
      {nextGame && (
        <Card tone="selected" style={{ gap: space.md }}>
          <Text variant="caption" color="textMuted">
            Suggested next
          </Text>
          <View style={{ gap: space.xs }}>
            <Text variant="title">{nextGame.title}</Text>
            <Text variant="body" color="textMuted">
              {nextGame.blurb}
            </Text>
          </View>
          <Button label={`Play ${nextGame.title}`} icon="play" onPress={() => router.push(`/game/${nextGame.id}`)} />
        </Card>
      )}

      {/* Panel 1 of 2. Kept separate from the questionnaire panel on purpose:
          the games and the check-in do not measure the same things, and one
          combined "improvement" figure would imply a link the data cannot
          support. See ARCHITECTURE.md §3. Coral here, sand there — the two
          panels never share a colour either. */}
      <Card style={{ gap: space.lg }}>
        <View style={{ gap: space.xs }}>
          <Text variant="heading">Trained</Text>
          <Text variant="body" color="textMuted">
            How you are doing in the games. Higher is better.
          </Text>
        </View>

        {playedGames.length === 0 ? (
          <Text variant="body" color="textMuted">
            No games played yet. Your progress will show up here.
          </Text>
        ) : (
          <>
            {playedGames.map((summary) => {
              const meta = getGame(summary.game_id);
              const series = trends[summary.game_id] ?? [];
              return (
                <View key={summary.game_id} style={{ gap: space.sm }}>
                  <LevelMeter
                    title={meta?.title ?? summary.game_id}
                    level={summary.current_level}
                    max={meta?.maxLevel ?? 15}
                  />
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text variant="caption" color="textMuted">
                      Accuracy, last {series.length} {series.length === 1 ? 'session' : 'sessions'}
                    </Text>
                    <Text variant="label">Avg {Math.round(summary.mean_accuracy * 100)}%</Text>
                  </View>
                  <Sparkline values={series} />
                  <Text variant="caption" color="textMuted">
                    {summary.plays} {summary.plays === 1 ? 'session' : 'sessions'} · best {summary.best_score}
                  </Text>
                </View>
              );
            })}
            <Text variant="caption" color="textMuted">
              Dashed line = your average.
            </Text>
          </>
        )}
      </Card>

      <Card style={{ gap: space.md }}>
        <View style={{ gap: space.xs }}>
          <Text variant="heading">Have a question?</Text>
          <Text variant="body" color="textMuted">
            Ask about your practice results in plain language.
          </Text>
        </View>
        <Button
          label="Ask about your results"
          variant="secondary"
          icon="chatbox-ellipses-outline"
          onPress={() => router.push('/chat')}
        />
      </Card>

      {/* Panel 2 of 2. */}
      <Card style={{ gap: space.md }}>
        <View style={{ gap: space.xs }}>
          <Text variant="heading">Self-reported</Text>
          <Text variant="body" color="textMuted">
            Your check-in answers. Lower is better here.
          </Text>
        </View>

        {!latest ? (
          <>
            <Text variant="body" color="textMuted">
              No check-in yet.
            </Text>
            <Button
              label="Take the check-in"
              variant="secondary"
              icon="clipboard-outline"
              onPress={() => router.push('/assessment')}
            />
          </>
        ) : (
          <>
            <View>
              <Score value={latest.total_score} max={100} />
              <Text variant="heading" color="warning">
                {bandInfo(latest.band).label}
              </Text>
            </View>
            <Dumbbell rows={domainRows} max={20} />
          </>
        )}
      </Card>
    </Screen>
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
