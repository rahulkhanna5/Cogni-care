import type { TownLevel } from './town';

/**
 * The town grows quickly — 3×3 crossroads at level 1, 4×4 at level 2, 5×5
 * from level 3 — and from then on road blocks do the work: 2 up to 8, with
 * more of them (`onRoute`) on the way a player would take without looking,
 * so the obvious route stops being the answer. 5×5 is the ceiling: past it a
 * crossroad on a phone is smaller than a comfortable tap.
 */
export const PATH_LEVELS: TownLevel[] = [
  { n: 3, blocks: 1, onRoute: 0 },
  { n: 4, blocks: 2, onRoute: 0 },
  { n: 5, blocks: 2, onRoute: 1 },
  { n: 5, blocks: 3, onRoute: 1 },
  { n: 5, blocks: 3, onRoute: 2 },
  { n: 5, blocks: 4, onRoute: 2 },
  { n: 5, blocks: 4, onRoute: 3 },
  { n: 5, blocks: 5, onRoute: 2 },
  { n: 5, blocks: 5, onRoute: 3 },
  { n: 5, blocks: 6, onRoute: 3 },
  { n: 5, blocks: 6, onRoute: 4 },
  { n: 5, blocks: 7, onRoute: 3 },
  { n: 5, blocks: 7, onRoute: 4 },
  { n: 5, blocks: 8, onRoute: 4 },
  { n: 5, blocks: 8, onRoute: 4 },
];

export const PATH_MAX_LEVEL = PATH_LEVELS.length;

export const pathLevel = (level: number): TownLevel =>
  PATH_LEVELS[Math.min(Math.max(level, 1), PATH_MAX_LEVEL) - 1];

export const describePathLevel = (level: number): string => {
  const s = pathLevel(level);
  return `${s.n} by ${s.n} streets, ${s.blocks} ${s.blocks === 1 ? 'road' : 'roads'} blocked`;
};
