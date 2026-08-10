import * as Haptics from 'expo-haptics';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';

import type { GamePlayProps } from '@/games/shell/types';
import { colors, radius, space } from '@/theme/tokens';
import { Text } from '@/ui';
import { EMOTION_LABELS, Face, type Emotion } from './Face';
import { meadowLevel, TRIALS_PER_ROUND } from './levels';

type Props = GamePlayProps & { random?: () => number };

type Trial = { faces: Emotion[]; answer: number };

export function buildTrials(
  pool: Emotion[],
  faceCount: number,
  trials: number,
  rnd: () => number
): Trial[] {
  return Array.from({ length: trials }, () => {
    // Distinct emotions per trial, otherwise two faces could both be correct.
    const available = [...pool];
    const faces: Emotion[] = [];
    while (faces.length < Math.min(faceCount, pool.length) && available.length) {
      faces.push(available.splice(Math.floor(rnd() * available.length), 1)[0]);
    }
    return { faces, answer: Math.floor(rnd() * faces.length) };
  });
}

export function EmotionMeadow({ level, onRoundComplete, random = Math.random }: Props) {
  const spec = meadowLevel(level);
  const { width } = useWindowDimensions();

  const trials = useMemo(
    () => buildTrials(spec.pool, spec.faceCount, TRIALS_PER_ROUND, random),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [level]
  );

  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const hits = useRef(0);
  const wrong = useRef(0);
  const latencies = useRef<number[]>([]);
  const shownAt = useRef(Date.now());
  const locked = useRef(false);

  const trial = trials[index];
  const target = trial.faces[trial.answer];

  const columns = trial.faces.length <= 4 ? 2 : 3;
  const faceSize = Math.min((width - space.lg * 2 - space.md * (columns - 1)) / columns, 150);

  const choose = useCallback(
    (i: number) => {
      if (locked.current) return;
      locked.current = true;

      const correct = i === trial.answer;
      if (correct) {
        hits.current += 1;
        latencies.current.push(Date.now() - shownAt.current);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else {
        wrong.current += 1;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
      setPicked(i);

      setTimeout(() => {
        if (index + 1 < trials.length) {
          setIndex((n) => n + 1);
          setPicked(null);
          shownAt.current = Date.now();
          locked.current = false;
          return;
        }

        const avg = latencies.current.length
          ? Math.round(latencies.current.reduce((a, b) => a + b, 0) / latencies.current.length)
          : null;

        onRoundComplete({
          hits: hits.current,
          // Every trial gets an answer, so a wrong pick is an error of
          // commission, not an omission. misses stays 0 by construction.
          misses: 0,
          falseAlarms: wrong.current,
          accuracy: hits.current / trials.length,
          avgReactionMs: avg,
          score: hits.current * 10,
        });
      }, 700);
    },
    [index, onRoundComplete, trial.answer, trials.length]
  );

  return (
    <View style={{ flex: 1, paddingHorizontal: space.lg }}>
      <Text variant="heading" center>
        Who looks {EMOTION_LABELS[target]}?
      </Text>
      <Text variant="body" color="textMuted" center style={{ marginBottom: space.lg }}>
        {index + 1} of {trials.length}
      </Text>

      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: space.md,
          justifyContent: 'center',
        }}
      >
        {trial.faces.map((emotion, i) => {
          const state =
            picked === null ? 'idle' : i === trial.answer ? 'correct' : i === picked ? 'wrong' : 'idle';

          return (
            <Pressable
              key={`${emotion}-${i}`}
              accessibilityRole="button"
              accessibilityLabel={`Face ${i + 1}`}
              onPress={() => choose(i)}
              style={{
                padding: space.sm,
                borderRadius: radius.lg,
                borderWidth: 3,
                borderColor:
                  state === 'correct'
                    ? colors.success
                    : state === 'wrong'
                      ? colors.danger
                      : 'transparent',
                backgroundColor: colors.surface,
              }}
            >
              <Face emotion={emotion} size={faceSize} intensity={spec.intensity} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
