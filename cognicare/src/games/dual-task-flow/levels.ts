export type DualLevel = {
  /** how long each item stays on screen / audible before the next one */
  stepMs: number;
  /** total items across both streams */
  totalItems: number;
  /** numbers are drawn from 1..range; a wider range is harder to read quickly */
  range: number;
};

/**
 * The two streams take turns — never at the same time.
 *
 * They originally ran concurrently on different periods, which is closer to
 * the classic divided-attention paradigm but is unanswerable in practice: a
 * number and a tone landing together give the player no way to know which
 * button the moment belongs to. Alternating keeps the task-switching load,
 * which is the other target this game was built for, and makes every moment
 * unambiguous.
 */
export const DUAL_LEVELS: DualLevel[] = [
  { stepMs: 2600, totalItems: 12, range: 9 },
  { stepMs: 2400, totalItems: 14, range: 9 },
  { stepMs: 2250, totalItems: 15, range: 19 },
  { stepMs: 2100, totalItems: 16, range: 19 },
  { stepMs: 2000, totalItems: 17, range: 19 },
  { stepMs: 1900, totalItems: 18, range: 19 },
  { stepMs: 1800, totalItems: 19, range: 39 },
  { stepMs: 1700, totalItems: 20, range: 39 },
  { stepMs: 1600, totalItems: 21, range: 39 },
  { stepMs: 1500, totalItems: 22, range: 59 },
  { stepMs: 1450, totalItems: 23, range: 59 },
  { stepMs: 1400, totalItems: 24, range: 79 },
  { stepMs: 1300, totalItems: 25, range: 79 },
  { stepMs: 1250, totalItems: 26, range: 99 },
  { stepMs: 1200, totalItems: 28, range: 99 },
];

export const DUAL_MAX_LEVEL = DUAL_LEVELS.length;

export const dualLevel = (level: number): DualLevel =>
  DUAL_LEVELS[Math.min(Math.max(level, 1), DUAL_MAX_LEVEL) - 1];

export const describeDualLevel = (level: number): string => {
  const s = dualLevel(level);
  return `Numbers up to ${s.range}, one item every ${(s.stepMs / 1000).toFixed(1)}s`;
};

export type DualEvent = {
  modality: 'visual' | 'audio';
  /** the number shown, or 1 for a high tone and 0 for a low one */
  value: number;
  isTarget: boolean;
};

/**
 * One item at a time, modality chosen at random so the player cannot settle
 * into a rhythm — strict alternation would let them predict every switch.
 * A run of four of the same modality is broken up for the same reason.
 */
export function buildTimeline(spec: DualLevel, rnd = Math.random): DualEvent[] {
  const events: DualEvent[] = [];
  let run = 0;

  for (let i = 0; i < spec.totalItems; i++) {
    const previous = events[events.length - 1]?.modality;
    const forced = run >= 3 ? (previous === 'visual' ? 'audio' : 'visual') : null;
    const modality = forced ?? (rnd() < 0.5 ? 'visual' : 'audio');

    run = modality === previous ? run + 1 : 1;

    if (modality === 'visual') {
      const value = 1 + Math.floor(rnd() * spec.range);
      events.push({ modality, value, isTarget: value % 2 === 1 });
    } else {
      const high = rnd() < 0.45;
      events.push({ modality, value: high ? 1 : 0, isTarget: high });
    }
  }

  return events;
}
