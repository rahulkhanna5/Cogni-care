import { SPRITE_H, SPRITE_W, type FallerSpec } from '@/games/shared/falling';
import { laneLayout } from '@/games/shared/lanes';
import type { CurrentLevel } from './levels';

export { SPRITE_H, SPRITE_W };

/** Four 72dp lanes fit across even a 320dp phone. */
export const LANES = 4;

/**
 * How long a lane stays closed behind an item going the same way, as a share
 * of its crossing. The crossing on the shortest screen is 318dp; an 82dp
 * sprite plus a margin needs 28% of it.
 */
export const FOLLOW_GAP = 0.3;

/**
 * Speedy Current's items in lanes, so a fish never swims through a leaf and
 * two leaves never drift stacked (see shared/lanes.ts). Fish and debris share
 * lanes over the turn, taking turns, so a lane never says which way its next
 * item will go — the direction of movement stays the only cue.
 */
export const currentLayout = (specs: FallerSpec[], level: CurrentLevel, random: () => number) =>
  laneLayout(specs, {
    windowMs: level.durationMs - level.travelMs,
    random,
    lanes: LANES,
    followGap: FOLLOW_GAP,
  });
