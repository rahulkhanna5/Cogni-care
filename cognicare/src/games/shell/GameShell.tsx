import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { endSession, getProgress, saveRound, startSession, updateProgress } from '@/db/queries';
import type { GameMeta } from '@/games/registry';
import { decideNextLevel, encourage, type Direction } from '@/scoring/adaptive';
import { useSession } from '@/store/session';
import { colors, space, TOUCH_MIN } from '@/theme/tokens';
import { Button, Card, Screen, Text } from '@/ui';
import type { GamePlayProps, RoundResult } from './types';

type Phase = 'intro' | 'countdown' | 'playing' | 'between' | 'summary';

type Props = {
  meta: GameMeta;
  maxLevel: number;
  roundsPerSession: number;
  /** Plain-language steps shown before play. Keep to three or four lines. */
  instructions: string[];
  /** Optional one-line hint about the current level, e.g. "4 by 4 grid". */
  describeLevel?: (level: number) => string;
  play: (props: GamePlayProps) => ReactNode;
};

export function GameShell({
  meta,
  maxLevel,
  roundsPerSession,
  instructions,
  describeLevel,
  play,
}: Props) {
  useKeepAwake(); // a game with a 4-second watch phase must not dim mid-trial

  const db = useSQLiteContext();
  const router = useRouter();
  const player = useSession((s) => s.player);

  const [phase, setPhase] = useState<Phase>('intro');
  const [level, setLevel] = useState(1);
  const [roundNo, setRoundNo] = useState(1);
  const [countdown, setCountdown] = useState(3);
  const [results, setResults] = useState<RoundResult[]>([]);
  const [lastRound, setLastRound] = useState<RoundResult | null>(null);
  const [outcome, setOutcome] = useState<{ direction: Direction; nextLevel: number } | null>(
    null
  );

  const sessionIdRef = useRef<number | null>(null);
  const lastDirectionRef = useRef<Direction | null>(null);

  // Resume at whatever level this player reached last time.
  useEffect(() => {
    if (!player) return;
    let cancelled = false;
    (async () => {
      const progress = await getProgress(db, player.id, meta.id);
      if (cancelled) return;
      setLevel(Math.min(progress.current_level, maxLevel));
      lastDirectionRef.current = progress.last_direction;
    })();
    return () => {
      cancelled = true;
    };
  }, [db, player, meta.id, maxLevel]);

  /* --------------------------------- start -------------------------------- */

  const begin = useCallback(async () => {
    if (!player) return;
    sessionIdRef.current = await startSession(db, player.id, meta.id, level);
    setResults([]);
    setRoundNo(1);
    setCountdown(3);
    setPhase('countdown');
  }, [db, player, meta.id, level]);

  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdown === 0) {
      setPhase('playing');
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 800);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  /* ------------------------------ round ends ------------------------------ */

  const handleRoundComplete = useCallback(
    async (result: RoundResult) => {
      const sessionId = sessionIdRef.current;
      if (sessionId != null) {
        await saveRound(db, sessionId, {
          roundNo,
          level,
          hits: result.hits,
          misses: result.misses,
          falseAlarms: result.falseAlarms,
          accuracy: result.accuracy,
          avgReactionMs: result.avgReactionMs,
        });
      }

      const all = [...results, result];
      setResults(all);
      setLastRound(result);

      if (roundNo < roundsPerSession) {
        setPhase('between');
        return;
      }

      // Session over — decide the next level and persist everything.
      const accuracy = all.reduce((sum, r) => sum + r.accuracy, 0) / all.length;
      const score = all.reduce((sum, r) => sum + r.score, 0);
      const reactions = all.map((r) => r.avgReactionMs).filter((n): n is number => n != null);
      const avgReactionMs = reactions.length
        ? Math.round(reactions.reduce((a, b) => a + b, 0) / reactions.length)
        : null;

      const decision = decideNextLevel({
        accuracy,
        currentLevel: level,
        maxLevel,
        lastDirection: lastDirectionRef.current,
      });

      if (sessionId != null) {
        await endSession(db, sessionId, {
          levelEnd: decision.level,
          accuracy,
          score,
          avgReactionMs,
        });
      }
      if (player) {
        await updateProgress(db, player.id, meta.id, {
          level: decision.level,
          direction: decision.direction,
          score,
        });
      }

      lastDirectionRef.current = decision.direction;
      setOutcome({ direction: decision.direction, nextLevel: decision.level });
      setPhase('summary');
    },
    [db, level, maxLevel, meta.id, player, results, roundNo, roundsPerSession]
  );

  const nextRound = useCallback(() => {
    setRoundNo((n) => n + 1);
    setPhase('playing');
  }, []);

  /* --------------------------------- views -------------------------------- */

  // Quitting part-way leaves ended_at NULL, and unfinished sessions are
  // excluded from stats. A half-played session should not count as data.
  const quit = () => router.back();

  if (phase === 'intro') {
    return (
      <Screen>
        <Header title={meta.title} onClose={quit} />
        <Card>
          <Text variant="heading">How to play</Text>
          {instructions.map((line, i) => (
            <Text key={i} variant="body" color="textMuted">
              {i + 1}. {line}
            </Text>
          ))}
        </Card>
        <Card>
          <Text variant="label">Level {level}</Text>
          {describeLevel && (
            <Text variant="body" color="textMuted">
              {describeLevel(level)}
            </Text>
          )}
          <Text variant="caption" color="textMuted">
            {roundsPerSession} turns. Take your time — speed is not the point.
          </Text>
        </Card>
        <Button label="Start" onPress={begin} />
      </Screen>
    );
  }

  if (phase === 'countdown') {
    return (
      <Screen scroll={false} style={{ justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 96, lineHeight: 110, fontWeight: '600', color: colors.accent }}>
          {countdown === 0 ? 'Go' : countdown}
        </Text>
      </Screen>
    );
  }

  if (phase === 'between' && lastRound) {
    return (
      <Screen scroll={false} style={{ justifyContent: 'center', gap: space.lg }}>
        <Text variant="title" center>
          Turn {roundNo} of {roundsPerSession}
        </Text>
        <Text variant="body" color="textMuted" center>
          {lastRound.hits} of {lastRound.hits + lastRound.misses} remembered
        </Text>
        <Button label="Next turn" onPress={nextRound} />
      </Screen>
    );
  }

  if (phase === 'summary' && outcome) {
    const accuracy = results.reduce((s, r) => s + r.accuracy, 0) / (results.length || 1);
    const score = results.reduce((s, r) => s + r.score, 0);
    return (
      <Screen>
        <Text variant="display" style={{ marginTop: space.lg }}>
          All done
        </Text>
        <Card>
          <Row label="Score" value={String(score)} />
          <Row label="Accuracy" value={`${Math.round(accuracy * 100)}%`} />
          <Row label="Level" value={`${level} → ${outcome.nextLevel}`} />
        </Card>
        <Text variant="body" color="textMuted">
          {encourage(outcome.direction, accuracy)}
        </Text>
        <Button label="Done" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen scroll={false} padded={false}>
      <View style={{ paddingHorizontal: space.lg, paddingTop: space.md }}>
        <Header title={`Turn ${roundNo} of ${roundsPerSession}`} onClose={quit} />
      </View>
      {play({ level, roundNo, totalRounds: roundsPerSession, onRoundComplete: handleRoundComplete })}
    </Screen>
  );
}

function Header({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: space.md,
      }}
    >
      <Text variant="heading">{title}</Text>
      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close game"
        hitSlop={12}
        style={{
          width: TOUCH_MIN,
          height: TOUCH_MIN,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="close" size={32} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text variant="body" color="textMuted">
        {label}
      </Text>
      <Text variant="label">{value}</Text>
    </View>
  );
}
