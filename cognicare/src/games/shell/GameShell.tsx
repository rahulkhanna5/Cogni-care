import { useRouter } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { View } from 'react-native';

import { LevelMeter } from '@/charts/LevelMeter';
import { endSession, getProgress, saveRound, startSession, updateProgress } from '@/db/queries';
import type { GameMeta } from '@/games/registry';
import { decideNextLevel, encourage, type Direction } from '@/scoring/adaptive';
import { useSession } from '@/store/session';
import { colors, fonts, space } from '@/theme/tokens';
import { Banner, Button, Card, Screen, ScreenHeader, StatTile, Text } from '@/ui';
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
  /**
   * The line shown between turns, in this game's own words ("You caught 5 of
   * 6 fish"). A generic "N of M remembered" was wrong for every game that is
   * not a memory game.
   */
  describeRound?: (result: RoundResult) => string;
  play: (props: GamePlayProps) => ReactNode;
};

export function GameShell({
  meta,
  maxLevel,
  roundsPerSession,
  instructions,
  describeLevel,
  describeRound,
  play,
}: Props) {
  // A game with a 4-second watch phase must not dim mid-trial. On web the
  // wake lock can fail to activate (a hidden page, or no Wake Lock API); the
  // hook ignores that, but then threw on leaving the game when it tried to
  // release a lock it never held. That release is exactly what this option
  // is for — it changes nothing on a phone, where activation succeeds.
  useKeepAwake(undefined, { suppressDeactivateWarnings: true });

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
  const [confirmingQuit, setConfirmingQuit] = useState(false);

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
      setConfirmingQuit(false);
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
  const leave = () => router.back();

  // Mid-session, ✕ asks first: with a tremor it is an easy accidental tap, and
  // it throws away the turns already played. Before or after, it just leaves.
  const midSession = phase === 'countdown' || phase === 'playing' || phase === 'between';
  const quit = () => (midSession ? setConfirmingQuit(true) : leave());

  // Without a local player there is nowhere to record a session, so Start
  // silently did nothing — a dead button with no explanation. Same failure as
  // the check-in screen had: an early return that leaves the user stuck.
  if (!player) {
    return (
      <Screen>
        <ScreenHeader title={meta.title} onBack={leave} backIcon="close" />
        <Card>
          <Text variant="heading">Almost there</Text>
          <Text variant="body" color="textMuted">
            Your results are saved against a name, so tell us who you are before
            playing.
          </Text>
        </Card>
        <Button label="Set up" onPress={() => router.replace('/welcome')} />
      </Screen>
    );
  }

  if (confirmingQuit) {
    return (
      <Screen scroll={false} style={{ justifyContent: 'center' }}>
        <Card style={{ gap: space.md }}>
          <Text variant="title">Stop this game?</Text>
          <Text variant="body" color="textMuted">
            The turns you have played so far will not be saved.
            {/* The game is paused by being set aside, so a turn in progress
                begins again rather than carrying on with its clock stopped. */}
            {phase === 'playing' ? ' If you keep playing, this turn starts again.' : ''}
          </Text>
          <Button label="Keep playing" onPress={() => setConfirmingQuit(false)} />
          <Button label="Stop" variant="secondary" onPress={leave} />
        </Card>
      </Screen>
    );
  }

  if (phase === 'intro') {
    return (
      <Screen>
        <ScreenHeader title={meta.title} onBack={quit} backIcon="close" />

        {meta.needsHeadphones && (
          <Banner tone="info" icon="headset-outline">
            Put your headphones in — this game needs sound from both sides.
          </Banner>
        )}

        <Card style={{ gap: space.md }}>
          <Text variant="heading">How to play</Text>
          {instructions.map((line, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: space.md, alignItems: 'flex-start' }}>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: colors.accent,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text variant="label" color="textInverse">
                  {i + 1}
                </Text>
              </View>
              <Text variant="body" style={{ flex: 1 }}>
                {line}
              </Text>
            </View>
          ))}
        </Card>

        <Card style={{ gap: space.md }}>
          <LevelMeter level={level} max={maxLevel} />
          {describeLevel && (
            <Text variant="body" color="textMuted">
              {describeLevel(level)}
            </Text>
          )}
          <Text variant="caption" color="textMuted">
            {roundsPerSession} turns. Take your time — speed is not the point.
          </Text>
        </Card>

        <Button label="Start" icon="play" onPress={begin} />
      </Screen>
    );
  }

  if (phase === 'countdown') {
    return (
      <Screen scroll={false} style={{ justifyContent: 'center', alignItems: 'center', gap: space.md }}>
        <Text
          accessibilityLiveRegion="assertive"
          style={{ fontSize: 120, lineHeight: 136, fontFamily: fonts.semibold, color: colors.accent }}
        >
          {countdown === 0 ? 'Go' : countdown}
        </Text>
        <Text variant="body" color="textMuted">
          Get ready
        </Text>
      </Screen>
    );
  }

  if (phase === 'between' && lastRound) {
    const total = lastRound.hits + lastRound.misses;
    return (
      <Screen scroll={false} style={{ justifyContent: 'center', gap: space.lg }}>
        <TurnDots done={roundNo} total={roundsPerSession} />
        <Text variant="title" center>
          Turn {roundNo} of {roundsPerSession} done
        </Text>
        <Text variant="body" color="textMuted" center>
          {describeRound ? describeRound(lastRound) : `${lastRound.hits} of ${total} right.`}
        </Text>
        <Button label="Next turn" icon="arrow-forward" onPress={nextRound} />
      </Screen>
    );
  }

  if (phase === 'summary' && outcome) {
    const accuracy = results.reduce((s, r) => s + r.accuracy, 0) / (results.length || 1);
    const score = results.reduce((s, r) => s + r.score, 0);
    const moved = outcome.nextLevel !== level;
    return (
      <Screen>
        <Text variant="display" style={{ marginTop: space.lg }}>
          All done
        </Text>

        <View style={{ flexDirection: 'row', gap: space.md }}>
          <StatTile value={String(score)} label="Score" />
          <StatTile value={`${Math.round(accuracy * 100)}%`} label="Accuracy" />
        </View>

        <Card style={{ gap: space.md }}>
          <LevelMeter level={outcome.nextLevel} max={maxLevel} title={meta.title} />
          <Text variant="body" color="textMuted">
            {moved ? `Level ${level} → ${outcome.nextLevel}` : `Staying at level ${level}`}
          </Text>
        </Card>

        <Banner tone={outcome.direction === 'up' ? 'success' : 'info'} icon={outcome.direction === 'up' ? 'trending-up' : 'leaf-outline'}>
          {encourage(outcome.direction, accuracy)}
        </Banner>

        <Button label="Done" onPress={leave} />
      </Screen>
    );
  }

  return (
    <Screen scroll={false} padded={false}>
      <View style={{ paddingHorizontal: space.gutter, paddingTop: space.md, marginBottom: space.sm }}>
        <ScreenHeader title={`Turn ${roundNo} of ${roundsPerSession}`} onBack={quit} backIcon="close" />
      </View>
      {play({ level, roundNo, totalRounds: roundsPerSession, onRoundComplete: handleRoundComplete })}
    </Screen>
  );
}

/** Turns so far: filled for played, outlined for still to come. */
function TurnDots({ done, total }: { done: number; total: number }) {
  return (
    <View
      accessible
      accessibilityLabel={`${done} of ${total} turns played`}
      style={{ flexDirection: 'row', justifyContent: 'center', gap: space.sm }}
    >
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={{
            width: 16,
            height: 16,
            borderRadius: 8,
            backgroundColor: i < done ? colors.accent : 'transparent',
            borderWidth: i < done ? 0 : 2,
            borderColor: colors.edge,
          }}
        />
      ))}
    </View>
  );
}
