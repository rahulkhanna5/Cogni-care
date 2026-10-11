import type { Emotion } from './Face';

export type MeadowLevel = {
  /** how many faces are on screen — capped by how many feelings the pool has */
  faceCount: number;
  /** 1 = full expression, lower = subtler. Only the drawn faces can be subtle. */
  intensity: number;
  /** emotions drawn on for this level */
  pool: Emotion[];
  /**
   * Share of a round's trials (0..1) built around a look-alike pair: the
   * answer is shown beside a feeling it is easily mistaken for. This is what
   * makes later levels harder in a way no amount of extra faces does.
   */
  similar: number;
};

const EASY: Emotion[] = ['happy', 'sad', 'angry', 'surprised'];
const FULL: Emotion[] = ['happy', 'sad', 'angry', 'surprised', 'worried', 'calm'];

/**
 * Feelings people confuse with one another — the partner joins the answer on
 * screen when a level asks for a look-alike trial.
 */
export const LOOK_ALIKES: Record<Emotion, Emotion[]> = {
  happy: ['calm', 'surprised'],
  calm: ['happy', 'sad'],
  sad: ['worried', 'angry'],
  worried: ['sad', 'surprised'],
  angry: ['sad', 'surprised'],
  surprised: ['worried', 'happy'],
};

/**
 * One thing gets harder at every level, and nothing gets easier:
 *
 *   faces      3 → 4 → 5 → 6      (more to search; 5 and 6 need the full pool)
 *   feelings   4 → 6              (worried and calm join at level 5)
 *   look-alike 0 → 1              (how many trials put the answer beside its twin)
 *   subtlety   1.0 → 0.45         (expressions soften; 0.45 is as faint as
 *                                  Face.tsx will draw them)
 *
 * Earlier the ladder had levels that only LOOKED different: with four
 * feelings there can only be four faces, so asking for five changed nothing,
 * and "subtle" does nothing to the animal faces used while the pool is four.
 * Levels 2 to 4 played identically, and levels 11 to 15 were one level.
 */
export const MEADOW_LEVELS: MeadowLevel[] = [
  { faceCount: 3, intensity: 1.0, pool: EASY, similar: 0 },
  { faceCount: 4, intensity: 1.0, pool: EASY, similar: 0 },
  { faceCount: 4, intensity: 1.0, pool: EASY, similar: 0.25 },
  { faceCount: 4, intensity: 1.0, pool: EASY, similar: 0.5 },
  { faceCount: 5, intensity: 1.0, pool: FULL, similar: 0.5 },
  { faceCount: 5, intensity: 0.9, pool: FULL, similar: 0.5 },
  { faceCount: 5, intensity: 0.9, pool: FULL, similar: 0.75 },
  { faceCount: 6, intensity: 0.9, pool: FULL, similar: 0.75 },
  { faceCount: 6, intensity: 0.8, pool: FULL, similar: 0.75 },
  { faceCount: 6, intensity: 0.8, pool: FULL, similar: 1 },
  { faceCount: 6, intensity: 0.7, pool: FULL, similar: 1 },
  { faceCount: 6, intensity: 0.6, pool: FULL, similar: 1 },
  { faceCount: 6, intensity: 0.55, pool: FULL, similar: 1 },
  { faceCount: 6, intensity: 0.5, pool: FULL, similar: 1 },
  { faceCount: 6, intensity: 0.45, pool: FULL, similar: 1 },
];

export const MEADOW_MAX_LEVEL = MEADOW_LEVELS.length;
export const TRIALS_PER_ROUND = 4;

export const meadowLevel = (level: number): MeadowLevel =>
  MEADOW_LEVELS[Math.min(Math.max(level, 1), MEADOW_MAX_LEVEL) - 1];

export const describeMeadowLevel = (level: number): string => {
  const s = meadowLevel(level);
  const faces = Math.min(s.faceCount, s.pool.length);
  const extras = [s.similar >= 0.5 ? 'look-alike feelings' : '', s.intensity < 0.7 ? 'very subtle expressions' : '']
    .filter(Boolean)
    .join(', ');
  return `${faces} faces${extras ? `, ${extras}` : ''}`;
};
