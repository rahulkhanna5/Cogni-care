import * as Haptics from 'expo-haptics';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';

import type { GamePlayProps } from '@/games/shell/types';
import { colors, radius, space, TOUCH_MIN } from '@/theme/tokens';
import { Text } from '@/ui';
import { buildTrial } from './levels';

type Props = GamePlayProps & { random?: () => number };

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function DailyOrder({ level, onRoundComplete, random = Math.random }: Props) {
  const trial = useMemo(
    () => buildTrial(level, random),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [level]
  );

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
      setTimeout(() => setWrong(null), 500);
    },
    [finish, placed, trial.answer]
  );

  const remaining = trial.choices.filter((c) => !placed.includes(c));

  return (
    <View style={{ flex: 1, paddingHorizontal: space.lg }}>
      <Text variant="heading" center>
        {trial.task.emoji} {trial.task.title}
      </Text>
      <Text variant="body" color="textMuted" center style={{ marginBottom: space.md }}>
        Tap the steps in the order you would really do them
      </Text>

      {/* What they have built so far, numbered, so the sequence is visible
          rather than held in memory while they work. */}
      {placed.length > 0 && (
        <View style={{ gap: space.xs, marginBottom: space.md }}>
          {placed.map((step, i) => (
            <View
              key={step}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: space.sm,
                backgroundColor: colors.accentSoft,
                borderRadius: radius.md,
                borderWidth: 2,
                borderColor: colors.accent,
                paddingHorizontal: space.md,
                paddingVertical: space.sm,
              }}
            >
              <Text variant="label" color="accent">
                {i + 1}
              </Text>
              <Text variant="body" style={{ flex: 1 }}>
                {step}
              </Text>
            </View>
          ))}
        </View>
      )}

      <View style={{ gap: space.sm }}>
        {remaining.map((step) => (
          <Pressable
            key={step}
            accessibilityRole="button"
            accessibilityLabel={step}
            onPress={() => choose(step)}
            style={{
              minHeight: TOUCH_MIN,
              justifyContent: 'center',
              paddingHorizontal: space.md,
              paddingVertical: space.sm,
              borderRadius: radius.md,
              borderWidth: 2,
              borderColor: wrong === step ? colors.danger : colors.border,
              backgroundColor: wrong === step ? colors.dangerSoft : colors.surface,
            }}
          >
            <Text variant="body" color={wrong === step ? 'danger' : 'text'}>
              {step}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text variant="caption" color="textMuted" center style={{ marginTop: space.md }}>
        {placed.length} of {trial.answer.length} in place
      </Text>
    </View>
  );
}
