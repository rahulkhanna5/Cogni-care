import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, Pressable, ScrollView, View, type ImageSourcePropType } from 'react-native';

import { Backdrop } from '@/games/shared/Backdrop';
import { AnimalTile, ResponsePad, type Feedback } from '@/games/shared/pieces';
import type { GamePlayProps } from '@/games/shell/types';
import { colors, radius, space } from '@/theme/tokens';
import { Button, Card, SurfaceProvider, Text, useReduceMotion, type IconName } from '@/ui';
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
const FEEDBACK_MS = 400;

/** The forest every turn is played in. Pads and tiles keep their own opaque fills on it. */
const FOREST: ImageSourcePropType = require('../../../assets/images/sound-forest.webp');

/** The picture behind a turn's play area, below its two heading lines. */
function Stage({ children, gap = space.md }: { children: ReactNode; gap?: number }) {
  return (
    <View style={{ flex: 1, marginBottom: space.lg }}>
      <Backdrop source={FOREST}>
        <View style={{ flex: 1, padding: space.md, gap }}>{children}</View>
      </Backdrop>
    </View>
  );
}

export function SoundForest({ level, roundNo, onRoundComplete, random = Math.random }: Props) {
  const spec = forestLevel(level);
  const mode = modeForRound(roundNo);
  const animals = useMemo(
    () => ANIMALS.slice(0, spec.animalCount).map((a) => a.id),
    [spec.animalCount]
  );

  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  /** True while a localisation sound is audible — drives the listening visual. */
  const [hearing, setHearing] = useState(false);
  const [index, setIndex] = useState(0);
  const [heard, setHeard] = useState<Animal[]>([]);
  const [flash, setFlash] = useState<{ key: string; fb: Feedback } | null>(null);

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

  const show = (key: string, fb: Feedback) => {
    setFlash({ key, fb });
    setTimeout(() => setFlash((f) => (f?.key === key ? null : f)), FEEDBACK_MS);
  };

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
      setHearing(true);
      await wait(500);
      playAnimal(trials[i].animal, trials[i].position);
      cueAt.current = Date.now();
      responded.current = false;
      // Answers open the moment the sound starts; the visual stays on for
      // roughly as long as the sound lasts.
      setPlaying(false);
      setTimeout(() => setHearing(false), 900);
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

    const ok = position === trials[index].position;
    if (ok) {
      hits.current += 1;
      latencies.current.push(Date.now() - cueAt.current);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      misses.current += 1;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    show(`side-${position}`, ok ? 'correct' : 'mistake');

    // Hold the mark before the next sound, so the player sees which it was.
    setTimeout(() => {
      if (index + 1 < trials.length) setIndex((n) => n + 1);
      else finish(trials.length);
    }, FEEDBACK_MS);
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
      show('pad', 'correct');
    } else {
      falseAlarms.current += 1;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      show('pad', 'mistake');
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
    if (playing || finished.current) return;
    const next = [...heard, animal];
    setHeard(next);

    if (animal === sequence[next.length - 1]) {
      hits.current += 1;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      show(`animal-${animal}-${next.length}`, 'correct');
      if (next.length === sequence.length) {
        latencies.current.push(Date.now() - cueAt.current);
        setTimeout(() => finish(sequence.length), FEEDBACK_MS);
      }
    } else {
      falseAlarms.current += 1;
      misses.current += sequence.length - next.length + 1;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      show(`animal-${animal}-${next.length}`, 'mistake');
      setTimeout(() => finish(sequence.length), FEEDBACK_MS);
    }
  };

  /* --------------------------------- views -------------------------------- */

  const label = (id: Animal) => ANIMALS.find((a) => a.id === id)!.label;

  // Before listening for one animal or repeating a sequence, the player hears
  // each call as often as they like. Recognising a sound you have never been
  // told is a guess, not memory — and that guess is what the data would show.
  if (!ready && mode !== 'localise') {
    const detecting = mode === 'detect';
    const tiles = (ids: Animal[]) => (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md, justifyContent: 'center' }}>
        {ids.map((id) => (
          <AnimalTile key={id} art={id} label={label(id)} onPress={() => playAnimal(id, 'centre')} />
        ))}
      </View>
    );

    return (
      <View style={{ flex: 1, paddingHorizontal: space.gutter, gap: space.sm }}>
        <Text variant="title" center>
          {detecting ? `Listen for the ${label(target).toLowerCase()}` : 'Hear each animal first'}
        </Text>
        <Text variant="body" color="textMuted" center style={{ marginBottom: space.sm }}>
          Tap an animal to hear its call. Tap as often as you like.
        </Text>

        <Stage>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
            <Card style={{ gap: space.md }}>
              {detecting ? (
                <>
                  <Text variant="label">Tap the pad only for this one</Text>
                  {tiles([target])}
                  {animals.length > 1 && <Text variant="label">Let these go by</Text>}
                  {tiles(animals.filter((a) => a !== target))}
                </>
              ) : (
                tiles(animals)
              )}
            </Card>
          </ScrollView>
        </Stage>

        <Button label="I know the sounds — start" onPress={() => setReady(true)} style={{ marginBottom: space.md }} />
      </View>
    );
  }

  if (!ready) {
    return (
      <View style={{ flex: 1, paddingHorizontal: space.gutter, justifyContent: 'center', gap: space.md }}>
        <View style={{ alignItems: 'center' }}>
          <View
            style={{
              width: 96,
              height: 96,
              borderRadius: 48,
              backgroundColor: colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="headset-outline" size={52} color={colors.accent} />
          </View>
        </View>
        <Text variant="title" center>
          Headphones needed
        </Text>
        <Text variant="body" color="textMuted" center>
          This game plays sounds from your left and right. A phone speaker cannot do
          that — without headphones every sound arrives in the middle.
        </Text>

        {/* Check the sound works BEFORE a scored round starts. Failing the
            first trials because the volume was down is not a memory problem,
            but it looks exactly like one in the data. */}
        <Text variant="label" center style={{ marginTop: space.sm }}>
          Try it first
        </Text>
        <View style={{ flexDirection: 'row', gap: space.md }}>
          <Button
            label="Left"
            icon="arrow-back"
            variant="secondary"
            style={{ flex: 1 }}
            onPress={() => playAnimal(animals[0] ?? 'owl', 'left')}
          />
          <Button
            label="Right"
            icon="arrow-forward"
            variant="secondary"
            style={{ flex: 1 }}
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
          style={{ marginTop: space.sm }}
        />
      </View>
    );
  }

  if (mode === 'localise') {
    return (
      <View style={{ flex: 1, paddingHorizontal: space.gutter, gap: space.md }}>
        <Text variant="title" center>
          Which side was that?
        </Text>
        <Text variant="body" color="textMuted" center>
          {index + 1} of {trials.length}
        </Text>

        <Stage>
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <Listening active={hearing} idleText="Tap the side it came from" />
          </View>

          {/* Laid out left to right, so the answer sits where the sound was. */}
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            {spec.positions.map((position) => (
              <SidePad
                key={position}
                position={position}
                disabled={playing}
                feedback={flash?.key === `side-${position}` ? flash.fb : null}
                onPress={() => answerPosition(position)}
              />
            ))}
          </View>
        </Stage>
      </View>
    );
  }

  if (mode === 'detect') {
    return (
      <View style={{ flex: 1, paddingHorizontal: space.gutter, gap: space.sm }}>
        <Text variant="title" center>
          Tap when you hear the {label(target).toLowerCase()}
        </Text>
        <Text variant="body" color="textMuted" center style={{ marginBottom: space.sm }}>
          Ignore every other animal
        </Text>

        <Stage>
          <ResponsePad
            art={target}
            label={`${label(target)} — tap here`}
            accessibilityLabel={`I heard the ${label(target)}`}
            feedback={flash?.key === 'pad' ? flash.fb : null}
            onPress={pressHeard}
          />
        </Stage>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, paddingHorizontal: space.gutter, gap: space.md }}>
      <Text variant="title" center>
        {playing ? 'Listen…' : 'Now tap them in order'}
      </Text>
      <Text variant="body" color="textMuted" center>
        {playing ? `${sequence.length} sounds` : `${heard.length} of ${sequence.length}`}
      </Text>

      <Stage gap={space.lg}>
        <View style={{ flex: 1, justifyContent: 'center', gap: space.lg }}>
          {playing && <Listening active />}

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md, justifyContent: 'center' }}>
            {animals.map((id) => {
              const key = flash?.key.startsWith(`animal-${id}-`) ? flash.fb : null;
              return (
                <AnimalTile
                  key={id}
                  art={id}
                  label={label(id)}
                  disabled={playing}
                  feedback={key}
                  onPress={() => pickAnimal(id)}
                />
              );
            })}
          </View>
        </View>
      </Stage>
    </View>
  );
}

/* -------------------------------- pieces ---------------------------------- */

/**
 * Something to look at while a sound plays, so the screen never looks frozen.
 * A gentle pulse; with Reduce Motion on it stays still.
 */
function Listening({ active, idleText }: { active: boolean; idleText?: string }) {
  const reduce = useReduceMotion();
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!active || reduce) {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.12, duration: 600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [active, reduce, pulse]);

  return (
    <View style={{ alignItems: 'center', gap: space.sm }} accessibilityLiveRegion="polite">
      <Animated.View
        style={{
          width: 108,
          height: 108,
          borderRadius: 54,
          backgroundColor: active ? colors.selected : colors.surface,
          borderWidth: active ? 3 : 2,
          borderColor: active ? colors.accent : colors.edge,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ scale: pulse }],
        }}
      >
        <Ionicons name={active ? 'ear' : 'ear-outline'} size={54} color={active ? colors.accent : colors.textMuted} />
      </Animated.View>
      {/* On its own pill: this line sits over the forest picture, which has
          no fixed colour to measure text against. */}
      {(active || idleText) && (
        <SurfaceProvider value="surface">
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: radius.pill,
              paddingHorizontal: space.md,
              paddingVertical: space.xs,
            }}
          >
            <Text variant="label" color={active ? 'accent' : 'textMuted'}>
              {active ? 'Listening…' : idleText}
            </Text>
          </View>
        </SurfaceProvider>
      )}
    </View>
  );
}

const SIDE: Record<Position, { label: string; icon: IconName }> = {
  left: { label: 'Left', icon: 'arrow-back' },
  centre: { label: 'Middle', icon: 'ellipse-outline' },
  right: { label: 'Right', icon: 'arrow-forward' },
};

function SidePad({
  position,
  disabled,
  feedback,
  onPress,
}: {
  position: Position;
  disabled: boolean;
  feedback: Feedback;
  onPress: () => void;
}) {
  const { label, icon } = SIDE[position];
  const fill = feedback === 'correct' ? colors.successSoft : feedback === 'mistake' ? colors.dangerSoft : colors.surface;
  const edge = feedback === 'correct' ? colors.success : feedback === 'mistake' ? colors.danger : colors.edge;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: 128,
        borderRadius: radius.md,
        backgroundColor: fill,
        borderWidth: feedback ? 3 : 2,
        borderStyle: feedback === 'mistake' ? 'dashed' : 'solid',
        borderColor: edge,
        alignItems: 'center',
        justifyContent: 'center',
        gap: space.sm,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Ionicons
        name={feedback === 'correct' ? 'checkmark' : feedback === 'mistake' ? 'remove-circle-outline' : icon}
        size={40}
        color={feedback === 'mistake' ? colors.danger : feedback === 'correct' ? colors.success : colors.accentOnCard}
      />
      <SurfaceProvider value="surface">
        <Text variant="title">{label}</Text>
      </SurfaceProvider>
    </Pressable>
  );
}
