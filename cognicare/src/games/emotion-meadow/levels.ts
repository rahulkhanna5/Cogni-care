import type { Emotion } from './Face';

export type MeadowLevel = {
  /** how many faces are on screen */
  faceCount: number;
  /** 1 = full expression, lower = subtler */
  intensity: number;
  /** emotions drawn on for this level */
  pool: Emotion[];
};

const EASY: Emotion[] = ['happy', 'sad', 'angry', 'surprised'];
const FULL: Emotion[] = ['happy', 'sad', 'angry', 'surprised', 'worried', 'calm'];

/**
 * Two axes: how many faces to search, and how subtle each expression is.
 * "worried" and "calm" join later because they are the pair most easily
 * confused with "sad" and "happy" at low intensity.
 */
export const MEADOW_LEVELS: MeadowLevel[] = [
  { faceCount: 3, intensity: 1.0, pool: EASY },
  { faceCount: 4, intensity: 1.0, pool: EASY },
  { faceCount: 4, intensity: 0.9, pool: EASY },
  { faceCount: 5, intensity: 0.9, pool: EASY },
  { faceCount: 4, intensity: 0.85, pool: FULL },
  { faceCount: 5, intensity: 0.8, pool: FULL },
  { faceCount: 5, intensity: 0.72, pool: FULL },
  { faceCount: 6, intensity: 0.68, pool: FULL },
  { faceCount: 6, intensity: 0.6, pool: FULL },
  { faceCount: 6, intensity: 0.54, pool: FULL },
  { faceCount: 6, intensity: 0.5, pool: FULL },
  { faceCount: 6, intensity: 0.5, pool: FULL },
  { faceCount: 6, intensity: 0.5, pool: FULL },
  { faceCount: 6, intensity: 0.5, pool: FULL },
  { faceCount: 6, intensity: 0.5, pool: FULL },
];

export const MEADOW_MAX_LEVEL = MEADOW_LEVELS.length;
export const TRIALS_PER_ROUND = 4;

export const meadowLevel = (level: number): MeadowLevel =>
  MEADOW_LEVELS[Math.min(Math.max(level, 1), MEADOW_MAX_LEVEL) - 1];

export const describeMeadowLevel = (level: number): string => {
  const s = meadowLevel(level);
  return `${s.faceCount} faces${s.intensity < 0.7 ? ', very subtle expressions' : ''}`;
};
