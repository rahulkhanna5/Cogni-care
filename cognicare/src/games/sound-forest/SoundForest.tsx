import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';

import type { GamePlayProps } from '@/games/shell/types';
import { colors, radius, space, TOUCH_MIN } from '@/theme/tokens';
import { Button, Text } from '@/ui';
import {
  buildLocalisation,
  buildSequence,
  buildSeries,
  forestLevel,
  modeForRound,
} from './levels';
import {
  ANIMALS,
  playAnimal,
  prepareAudio,
  releaseAudio,
  type Animal,
  type Position,
} from './sounds';

type Props = GamePlayProps & { random?: () => number };

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function SoundForest({ level, roundNo, onRoundComplete, random = Math.random }: Props) {
  const spec = forestLevel(level);
  const mode = modeForRound(roundNo);
  const animals = useMemo(
    () => ANIMALS.slice(0, spec.animalCount).map((a) => a.id),
    [spec.animalCount]
  );

  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [index, setIndex] = useState(0);
  const [heard, setHeard] = useState<Animal[]>([]);

  const hits = useRef(0);
  const misses = useRef(0);
  const falseAlarms = useRef(0);
  const latencies = useRef<number[]>([]);
  const cueAt = useRef(0);
  const responded = useRef(false);
  const finished = useRef(false);

  const trials = useMemo(
    () => buildLocalisation(spec, animals, random),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [level, roundNo]
  );
  const target = animals[0];
  const series = useMemo(
    () => buildSeries(spec, animals, target, random),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [level, roundNo]
  );
  const sequence = useMemo(
    () => buildSequence(spec, animals, random),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [level, roundNo]
  );

  useEffect(() => {
    prepareAudio();
    return () => releaseAudio();
  }, []);

  const finish = useCallback(
    (total: number) => {
      if (finished.current) return;
      finished.current = true;
      const avg = latencies.current.length
        ? Math.round(latencies.current.reduce((a, b) => a + b, 0) / latencies.current.length)
        : null;
      onRoundComplete({
        hits: hits.current,
        misses: misses.current,
        falseAlarms: falseAlarms.current,
        accuracy: total === 0 ? 0 : hits.current / total,
        avgReactionMs: avg,
        score: hits.current * 10,
      });
    },
    [onRoundComplete]
  );

  /* ------------------------------- localise ------------------------------- */

  const playLocalisation = useCallback(
    async (i: number) => {
      setPlaying(true);
      await wait(500);
      playAnimal(trials[i].animal, trials[i].position);
      cueAt.current = Date.now();
      responded.current = false;
      setPlaying(false);
    },
    [trials]
  );

  useEffect(() => {
    if (mode !== 'localise' || !ready) return;
    playLocalisation(index);
  }, [mode, ready, index, playLocalisation]);

  const answerPosition = (position: Position) => {
    if (responded.current) return;
    responded.current = true;

    if (position === trials[index].position) {
      hits.current += 1;
      latencies.current.push(Date.now() - cueAt.current);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      misses.current += 1;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }

    if (index + 1 < trials.length) setIndex((n) => n + 1);
    else finish(trials.length);
  };

  /* -------------------------------- detect -------------------------------- */

  const runSeries = useCallback(async () => {
    setPlaying(true);
    for (let i = 0; i < series.length; i++) {
      setIndex(i);
      playAnimal(series[i].animal, series[i].position);
      cueAt.current = Date.now();
      responded.current = false;
      await wait(spec.gapMs + 500);

      if (series[i].isTarget && !responded.current) misses.current += 1;
    }
    setPlaying(false);
    finish(series.filter((s) => s.isTarget).length);
  }, [series, spec.gapMs, finish]);

  useEffect(() => {
    if (mode !== 'detect' || !ready) return;
    runSeries();
  }, [mode, ready, runSeries]);

  const pressHeard = () => {
    if (responded.current) return;
    responded.current = true;

    if (series[index]?.isTarget) {
      hits.current += 1;
      latencies.current.push(Date.now() - cueAt.current);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      falseAlarms.current += 1;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  };

  /* -------------------------------- recall -------------------------------- */

  const playSequence = useCallback(async () => {
    setPlaying(true);
    await wait(600);
    for (const animal of sequence) {
      playAnimal(animal, 'centre');
      await wait(spec.gapMs + 400);
    }
    setPlaying(false);
    cueAt.current = Date.now();
  }, [sequence, spec.gapMs]);

  useEffect(() => {
    if (mode !== 'recall' || !ready) return;
    playSequence();
  }, [mode, ready, playSequence]);

  const pickAnimal = (animal: Animal) => {
    if (playing) return;
    const next = [...heard, animal];
    setHeard(next);

    if (animal === sequence[next.length - 1]) {
      hits.current += 1;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (next.length === sequence.length) {
        latencies.current.push(Date.now() - cueAt.current);
        finish(sequence.length);
      }
    } else {
      falseAlarms.current += 1;
      misses.current += sequence.length - next.length + 1;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      finish(sequence.length);
    }
  };

  /* --------------------------------- views -------------------------------- */

  if (!ready) {
    return (
      <View style={{ flex: 1, paddingHorizontal: space.lg, justifyContent: 'center', gap: space.md }}>
        <Text variant="heading" center>
          Headphones needed
        </Text>
        <Text variant="body" color="textMuted" center>
          This game plays sounds from your left and right. A phone speaker cannot do
          that — without headphones every sound arrives in the middle.
        </Text>

        {/* Check the sound works BEFORE a scored round starts. Failing the
            first trials because the volume was down is not a memory problem,
            but it looks exactly like one in the data. */}
        <Text variant="label" center style={{ marginTop: space.md }}>
          Try it first
        </Text>
        <View style={{ flexDirection: 'row', gap: space.md }}>
          <Button
            label="◀ Left"
            variant="secondary"
            onPress={() => playAnimal(animals[0] ?? 'owl', 'left')}
          />
          <Button
            label="Right ▶"
            variant="secondary"
            onPress={() => playAnimal(animals[0] ?? 'owl', 'right')}
          />
        </View>
        <Text variant="caption" color="textMuted" center>
          Turn the volume up if you hear nothing. Each should clearly come from one
          side only.
        </Text>

        <Button
          label="I can hear the difference — start"
          onPress={() => setReady(true)}
          style={{ marginTop: space.md }}
        />
      </View>
    );
  }

  const animalMeta = (id: Animal) => ANIMALS.find((a) => a.id === id)!;

  if (mode === 'localise') {
    return (
      <View style={{ flex: 1, paddingHorizontal: space.lg }}>
        <Text variant="heading" center>
          Which side was that?
        </Text>
        <Text variant="body" color="textMuted" center style={{ marginBottom: space.xl }}>
          {index + 1} of {trials.length}
        </Text>

        <View style={{ gap: space.md }}>
          {spec.positions.map((position) => (
            <Button
              key={position}
              label={position === 'centre' ? 'Middle' : position === 'left' ? 'Left' : 'Right'}
              variant="secondary"
              disabled={playing}
              onPress={() => answerPosition(position)}
            />
          ))}
        </View>
      </View>
    );
  }

  if (mode === 'detect') {
    return (
      <View style={{ flex: 1, paddingHorizontal: space.lg }}>
        <Text variant="heading" center>
          Tap when you hear the {animalMeta(target).label.toLowerCase()}
        </Text>
        <Text variant="body" color="textMuted" center style={{ marginBottom: space.lg }}>
          Ignore every other animal
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`I heard the ${animalMeta(target).label}`}
          onPress={pressHeard}
          style={{
            flex: 1,
            borderRadius: radius.lg,
            backgroundColor: colors.accentSoft,
            borderWidth: 3,
            borderColor: colors.accent,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: space.lg,
          }}
        >
          <Text style={{ fontSize: 72, lineHeight: 84 }}>{animalMeta(target).emoji}</Text>
          <Text variant="label" color="accent">
            Tap here
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, paddingHorizontal: space.lg }}>
      <Text variant="heading" center>
        {playing ? 'Listen…' : 'Now tap them in order'}
      </Text>
      <Text variant="body" color="textMuted" center style={{ marginBottom: space.lg }}>
        {playing ? `${sequence.length} sounds` : `${heard.length} of ${sequence.length}`}
      </Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md, justifyContent: 'center' }}>
        {animals.map((id) => {
          const meta = animalMeta(id);
          return (
            <Pressable
              key={id}
              accessibilityRole="button"
              accessibilityLabel={meta.label}
              disabled={playing}
              onPress={() => pickAnimal(id)}
              style={{
                width: 96,
                minHeight: TOUCH_MIN + 40,
                borderRadius: radius.lg,
                backgroundColor: colors.surface,
                borderWidth: 2,
                borderColor: colors.border,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: playing ? 0.4 : 1,
              }}
            >
              <Text style={{ fontSize: 40, lineHeight: 46 }}>{meta.emoji}</Text>
              <Text variant="caption">{meta.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
