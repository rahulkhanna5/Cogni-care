import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Image, Pressable, useWindowDimensions, View, type ImageSourcePropType } from 'react-native';

import { Backdrop } from '@/games/shared/Backdrop';
import type { GamePlayProps } from '@/games/shell/types';
import { colors, radius, space } from '@/theme/tokens';
import { Text } from '@/ui';
import { EMOTION_LABELS, Face, type Emotion } from './Face';
import { animalFace, ANIMALS, hasAnimalFacesFor } from './animals';
import { meadowLevel, TRIALS_PER_ROUND } from './levels';
import { hasPhotosFor, pickPhoto } from './photos';

type Props = GamePlayProps & { random?: () => number };

/** The meadow the faces are found in. The face tiles are opaque, so they read over any of it. */
const MEADOW: ImageSourcePropType = require('../../../assets/images/emotion-meadow.webp');

type Trial = { faces: Emotion[]; answer: number };

export function buildTrials(pool: Emotion[], faceCount: number, trials: number, rnd: () => number): Trial[] {
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

type TileState = 'idle' | 'correct' | 'mistake';

export type FaceKind = 'photo' | 'animal' | 'drawn';

/**
 * Which faces a trial shows. Validated photographs if every feeling in it has
 * one, else the illustrated animals if they cover every feeling, else the
 * drawn faces. All or nothing within a trial: a mix would make the odd one
 * out solvable without reading a single expression.
 */
export function faceKind(emotions: Emotion[]): FaceKind {
  if (hasPhotosFor(emotions)) return 'photo';
  if (hasAnimalFacesFor(emotions)) return 'animal';
  return 'drawn';
}

export function EmotionMeadow({ level, onRoundComplete, random = Math.random }: Props) {
  const spec = meadowLevel(level);
  const { width } = useWindowDimensions();

  const trials = useMemo(
    () => buildTrials(spec.pool, spec.faceCount, TRIALS_PER_ROUND, random),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [level]
  );
  // The animal for the first trial; each trial after moves to the next.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const firstAnimal = useMemo(() => Math.floor(random() * ANIMALS.length), [level]);

  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const hits = useRef(0);
  const wrong = useRef(0);
  const latencies = useRef<number[]>([]);
  const shownAt = useRef(Date.now());
  const locked = useRef(false);

  const trial = trials[index];
  const target = trial.faces[trial.answer];

  const kind = faceKind(trial.faces);
  // One animal for every face in a trial — four dogs, say — so the only
  // difference between the faces is the feeling they show.
  const animal = ANIMALS[(firstAnimal + index) % ANIMALS.length];

  const columns = trial.faces.length <= 4 ? 2 : 3;
  // Room for the screen gutters, the picture's inner margin and the gaps.
  const tile = Math.min((width - space.gutter * 2 - space.md * 2 - space.md * (columns - 1)) / columns, 164);
  const faceSize = tile - space.sm * 2 - 6;

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

      // Long enough to see which face it was, on a right answer or a wrong one.
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
      }, 900);
    },
    [index, onRoundComplete, trial.answer, trials.length]
  );

  return (
    <View style={{ flex: 1, paddingHorizontal: space.gutter }}>
      <Text variant="title" center>
        {kind === 'animal'
          ? `Which ${animal} looks ${EMOTION_LABELS[target]}?`
          : `Who looks ${EMOTION_LABELS[target]}?`}
      </Text>
      <Text variant="body" color="textMuted" center style={{ marginBottom: space.sm }}>
        {index + 1} of {trials.length}
      </Text>

      <View style={{ flex: 1, marginBottom: space.lg }}>
        <Backdrop source={MEADOW}>
          <View style={{ flex: 1, justifyContent: 'center', padding: space.md }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md, justifyContent: 'center' }}>
              {trial.faces.map((emotion, i) => {
                // After a pick, the right face is always shown — a wrong pick is a
                // chance to see the answer, not only a mark against the player.
                const state: TileState =
                  picked === null
                    ? 'idle'
                    : i === trial.answer
                      ? 'correct'
                      : i === picked
                        ? 'mistake'
                        : 'idle';

                return (
                  <Pressable
                    key={`${emotion}-${i}`}
                    accessibilityRole="button"
                    accessibilityLabel={`Face ${i + 1}`}
                    onPress={() => choose(i)}
                    // No frame: the faces stand in the meadow itself. The tap
                    // area is still the whole square.
                    style={{ width: tile, height: tile, alignItems: 'center', justifyContent: 'center' }}
                  >
                    {/* After a pick, a ring says right or wrong — solid green, or
                        dashed red — with a tick or dash badge, never colour alone. */}
                    {state !== 'idle' && (
                      <View
                        style={{
                          position: 'absolute',
                          width: tile,
                          height: tile,
                          borderRadius: tile / 2,
                          borderWidth: 4,
                          borderStyle: state === 'mistake' ? 'dashed' : 'solid',
                          borderColor: state === 'correct' ? colors.success : colors.danger,
                          backgroundColor: `${state === 'correct' ? colors.successSoft : colors.dangerSoft}B3`,
                        }}
                      />
                    )}

                    {kind === 'photo' ? (
                      <Image
                        source={pickPhoto(emotion, i + index)!}
                        style={{ width: faceSize, height: faceSize, borderRadius: radius.md }}
                        resizeMode="cover"
                        accessibilityIgnoresInvertColors
                      />
                    ) : kind === 'animal' ? (
                      <>
                        {/* A soft shadow on the ground, so the animal stands in
                            the jungle rather than floating over it. */}
                        <View
                          style={{
                            position: 'absolute',
                            bottom: tile * 0.06,
                            width: tile * 0.62,
                            height: tile * 0.12,
                            borderRadius: tile,
                            backgroundColor: 'rgba(0,0,0,0.35)',
                          }}
                        />
                        <Image
                          source={animalFace(animal, emotion)!}
                          style={{ width: tile * 0.94, height: tile * 0.94 }}
                          resizeMode="contain"
                          accessibilityIgnoresInvertColors
                        />
                      </>
                    ) : (
                      <Face emotion={emotion} size={faceSize} intensity={spec.intensity} />
                    )}

                    {state !== 'idle' && <Badge ok={state === 'correct'} />}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Backdrop>
      </View>
    </View>
  );
}

/** A check or a dash in the corner, so right and wrong differ by shape too. */
function Badge({ ok }: { ok: boolean }) {
  return (
    <View
      style={{
        position: 'absolute',
        top: 6,
        right: 6,
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: ok ? colors.success : colors.dangerSoft,
        borderWidth: ok ? 0 : 2,
        borderColor: colors.danger,
      }}
    >
      <Ionicons name={ok ? 'checkmark' : 'remove'} size={22} color={ok ? colors.ink : colors.danger} />
    </View>
  );
}
