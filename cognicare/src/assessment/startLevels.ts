import type { Band } from '@/db/types';
import { GAMES } from '@/games/registry';

/**
 * The level each game starts at, from the check-in band.
 *
 * The check-in score runs the OTHER way to a game score (higher = more
 * impairment), so a healthier band starts further up the ladder and a more
 * impaired one starts at the bottom, where a first win is certain. Starting
 * the most impaired people on level 8 would only teach them failure.
 *
 * The three numbers are the product owner's (Mild 3, Moderate 5, top 8); the
 * direction was confirmed with them — see CLAUDE.md.
 */
export const START_LEVEL: Record<Band, number> = {
  normal: 8,
  mild: 5,
  moderate: 3,
  severe: 1,
};

/** Top level of each game, from the registry so the two cannot drift. A preset above it is capped. */
export const GAME_MAX_LEVEL: Record<string, number> = Object.fromEntries(GAMES.map((g) => [g.id, g.maxLevel]));

/** The preset for one game, never below 1 and never above that game's top. */
export const startLevelFor = (band: Band, gameId: string): number =>
  Math.max(1, Math.min(START_LEVEL[band], GAME_MAX_LEVEL[gameId] ?? START_LEVEL[band]));

/** The preset for every game at once, keyed by game id. */
export const startLevelsFor = (band: Band): Record<string, number> =>
  Object.fromEntries(Object.keys(GAME_MAX_LEVEL).map((id) => [id, startLevelFor(band, id)]));
