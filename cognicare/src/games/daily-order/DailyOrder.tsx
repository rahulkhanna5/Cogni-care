import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, useWindowDimensions, View } from 'react-native';

import { ActionCard } from '@/games/shared/ActionCard';
import type { GamePlayProps } from '@/games/shell/types';
import { colors, radius, space } from '@/theme/tokens';
import { Text } from '@/ui';
import { buildTrial, recentTasks, rememberTask } from './levels';
import { stepPicture } from './scenes';

type Props = GamePlayProps & { random?: () => number };

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function DailyOrder({ level, onRoundComplete, random = Math.random }: Props) {
  // Avoids the routines shown in the last few rounds, so going up a level (or
  // playing on) never repeats the task just done.
  const trial = useMemo(
    () => buildTrial(level, random, recentTasks()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [level]
  );
  useEffect(() => {
    rememberTask(trial.task.id);
  }, [trial]);

  const [placed, setPlaced] = useState<string[]>([]);
  const [wrong, setWrong] = useState<string | null>(null);

  const firstTryHits = useRef(0);
  const mistakes = useRef(0);
  const latencies = useRef<number[]>([]);
  const lastAt = useRef(Date.now());
  const erredOnCurrent = useRef(false);
  const finished = useRef(false);

  const finish = useCallback(async () => {
    if (finished.current) return;
    finished.current = true;

    const total = trial.answer.length;
    const avg = latencies.current.length
      ? Math.round(latencies.current.reduce((a, b) => a + b, 0) / latencies.current.length)
      : null;

    await wait(700);

    onRoundComplete({
      hits: firstTryHits.current,
      misses: total - firstTryHits.current,
      // A wrong step is choosing an action that does not come next — an error
      // of commission, the same shape as tapping a distractor elsewhere.
      falseAlarms: mistakes.current,
      accuracy: firstTryHits.current / total,
      avgReactionMs: avg,
      score: firstTryHits.current * 10 + (mistakes.current === 0 ? 30 : 0),
    });
  }, [onRoundComplete, trial.answer.length]);

  const choose = useCallback(
    (step: string) => {
      if (finished.current || placed.includes(step)) return;

      const expected = trial.answer[placed.length];
      const now = Date.now();

      if (step === expected) {
        latencies.current.push(now - lastAt.current);
        lastAt.current = now;
        // Only counted if they got this position right without a wrong try
        // first — otherwise a player could tap every option in turn and score
        // full marks by elimination.
        if (!erredOnCurrent.current) firstTryHits.current += 1;
        erredOnCurrent.current = false;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const next = [...placed, step];
        setPlaced(next);
        if (next.length === trial.answer.length) finish();
        return;
      }

      // Wrong step: it stays available and they try again. Ending the round on
      // one mistake would be harsh for a task the player plainly knows how to
      // do — the measure is how cleanly they order it, not whether they slip.
      mistakes.current += 1;
      erredOnCurrent.current = true;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setWrong(step);
      setTimeout(() => setWrong((w) => (w === step ? null : w)), 600);
    },
    [finish, placed, trial.answer]
  );

  const remaining = trial.choices.filter((c) => !placed.includes(c));

  // Two picture cards a row to choose from; the order so far three a row.
  const { width } = useWindowDimensions();
  const content = Math.min(width, 600) - space.gutter * 2;
  const choiceWidth = Math.floor((content - space.sm) / 2);
  const placedWidth = Math.floor((content - space.sm * 2) / 3);

  return (
    <ScrollView
      contentContainerStyle={{
        width: content + space.gutter * 2,
        alignSelf: 'center',
        paddingHorizontal: space.gutter,
        paddingBottom: space.xl,
        gap: space.sm,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm + 4 }}>
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: radius.md,
            backgroundColor: colors.surface,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={trial.task.icon} size={28} color={colors.accent} />
        </View>
        <Text variant="heading" style={{ flexShrink: 1 }}>
          {trial.task.title}
        </Text>
      </View>
      <Text variant="body" color="textMuted" center style={{ marginBottom: space.sm }}>
        Tap the steps in the order you would really do them
      </Text>

      {/* What they have built so far, numbered, so the sequence is visible
          rather than held in memory while they work. */}
      {placed.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {placed.map((step, i) => (
            <ActionCard
              key={step}
              text={step}
              picture={stepPicture(step)}
              fallbackIcon={trial.task.icon}
              state="placed"
              position={i + 1}
              width={placedWidth}
            />
          ))}
        </View>
      )}

      {placed.length > 0 && remaining.length > 0 && (
        <View style={{ height: 2, backgroundColor: colors.divider, marginVertical: space.xs }} />
      )}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {remaining.map((step) => (
          <ActionCard
            key={step}
            text={step}
            picture={stepPicture(step)}
            fallbackIcon={trial.task.icon}
            state={wrong === step ? 'mistake' : 'available'}
            width={choiceWidth}
            onPress={() => choose(step)}
          />
        ))}
      </View>

      <Text variant="caption" color="textMuted" center style={{ marginTop: space.sm }}>
        {placed.length} of {trial.answer.length} in place
      </Text>
    </ScrollView>
  );
}
