import { LEVEL_1 } from './data/level1';
import type { CityLevel } from './engine/types';

/**
 * Hand-made towns, one per level. A new level is a new file in data/ added
 * here — the engine and the map need no changes. Until level 2 exists the
 * game stays at level 1, and saved progress from the old generated towns
 * (up to 15) clamps to it.
 */
export const PATH_LEVELS: CityLevel[] = [LEVEL_1];

export const PATH_MAX_LEVEL = PATH_LEVELS.length;

export const pathLevel = (level: number): CityLevel =>
  PATH_LEVELS[Math.min(Math.max(level, 1), PATH_MAX_LEVEL) - 1];

export const describePathLevel = (level: number): string => {
  const l = pathLevel(level);
  return `${l.title} — ${l.trips.length} walks across town`;
};
