export type DualLevel = {
  /** how long a number stays on screen */
  visualIntervalMs: number;
  /** how often a tone plays */
  audioIntervalMs: number;
  /** total items in the visual stream */
  visualCount: number;
  /** numbers are drawn from 1..range; a wider range makes them harder to read fast */
  range: number;
};

/**
 * The two streams run on deliberately different periods so they drift in and
 * out of phase. Locking them together would let the player treat it as one
 * rhythm, which is exactly the divided-attention load we want to keep.
 */
export const DUAL_LEVELS: DualLevel[] = [
  { visualIntervalMs: 2200, audioIntervalMs: 3100, visualCount: 12, range: 9 },
  { visualIntervalMs: 2000, audioIntervalMs: 2900, visualCount: 14, range: 9 },
  { visualIntervalMs: 1900, audioIntervalMs: 2700, visualCount: 15, range: 19 },
  { visualIntervalMs: 1800, audioIntervalMs: 2600, visualCount: 16, range: 19 },
  { visualIntervalMs: 1700, audioIntervalMs: 2400, visualCount: 17, range: 19 },
  { visualIntervalMs: 1600, audioIntervalMs: 2300, visualCount: 18, range: 19 },
  { visualIntervalMs: 1500, audioIntervalMs: 2200, visualCount: 19, range: 39 },
  { visualIntervalMs: 1400, audioIntervalMs: 2100, visualCount: 20, range: 39 },
  { visualIntervalMs: 1300, audioIntervalMs: 2000, visualCount: 21, range: 39 },
  { visualIntervalMs: 1250, audioIntervalMs: 1900, visualCount: 22, range: 59 },
  { visualIntervalMs: 1200, audioIntervalMs: 1800, visualCount: 23, range: 59 },
  { visualIntervalMs: 1100, audioIntervalMs: 1700, visualCount: 24, range: 79 },
  { visualIntervalMs: 1050, audioIntervalMs: 1600, visualCount: 25, range: 79 },
  { visualIntervalMs: 1000, audioIntervalMs: 1500, visualCount: 26, range: 99 },
  { visualIntervalMs: 950, audioIntervalMs: 1400, visualCount: 28, range: 99 },
];

export const DUAL_MAX_LEVEL = DUAL_LEVELS.length;

export const dualLevel = (level: number): DualLevel =>
  DUAL_LEVELS[Math.min(Math.max(level, 1), DUAL_MAX_LEVEL) - 1];

export const describeDualLevel = (level: number): string => {
  const s = dualLevel(level);
  return `Numbers up to ${s.range}, one every ${(s.visualIntervalMs / 1000).toFixed(1)}s`;
};

export type Stream = { value: number; isTarget: boolean }[];

/** Visual stream: tap the odd numbers. */
export function buildNumbers(spec: DualLevel, rnd = Math.random): Stream {
  return Array.from({ length: spec.visualCount }, () => {
    const value = 1 + Math.floor(rnd() * spec.range);
    return { value, isTarget: value % 2 === 1 };
  });
}

/** Auditory stream: tap only on the high tone. */
export function buildTones(count: number, rnd = Math.random): Stream {
  return Array.from({ length: count }, () => {
    const high = rnd() < 0.4;
    return { value: high ? 1 : 0, isTarget: high };
  });
}
