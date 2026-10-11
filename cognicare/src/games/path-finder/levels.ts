import { LEVEL_1 } from './data/level1';
import { LEVEL_2, LEVEL_3, LEVEL_4, LEVEL_5, LEVEL_6 } from './data/towns';
import type { CityLevel } from './engine/types';

/**
 * Hand-made towns, one per level, each harder than the last. A new level is a
 * new spec in data/ added here — the engine and the map need no changes. How
 * hard each one is gets measured, not assumed: see engine/difficulty.ts and
 * data/levels.test.ts. Saved progress from the old generated towns (up to 15)
 * clamps to the top level.
 */
export const PATH_LEVELS: CityLevel[] = [LEVEL_1, LEVEL_2, LEVEL_3, LEVEL_4, LEVEL_5, LEVEL_6];

export const PATH_MAX_LEVEL = PATH_LEVELS.length;

export const pathLevel = (level: number): CityLevel => PATH_LEVELS[Math.min(Math.max(level, 1), PATH_MAX_LEVEL) - 1];

export const describePathLevel = (level: number): string => {
  const l = pathLevel(level);
  return `${l.title} — ${l.trips.length} walks across town`;
};
