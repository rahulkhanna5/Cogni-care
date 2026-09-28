import { schedule, SPRITE_H, SPRITE_W, type FallerSpec } from '@/games/shared/falling';
import { laneLayout } from '@/games/shared/lanes';
import { DRIFT, FISH, PREDATORS, type CurrentLevel } from './levels';

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

/**
 * A whole round: fish to tap, from the bottom and from the top; sharks (never
 * tap) swimming up; debris drifting down. The game and its tests both build
 * rounds here, so what is tested is what is played.
 */
export function currentRound(level: CurrentLevel, random: () => number): FallerSpec[] {
  const common = { durationMs: level.durationMs, travelMs: level.travelMs, random };
  const main = schedule({
    ...common,
    targetCount: level.targetCount - level.fromTop,
    distractorCount: level.distractorCount,
    forbiddenCount: level.forbiddenCount,
    targets: FISH,
    distractors: DRIFT,
    forbidden: PREDATORS,
    direction: 'up',
    distractorDirection: 'down',
  });
  // The rest of the fish come down from the top. Still fish, still to tap.
  const fromTop = schedule({
    ...common,
    targetCount: level.fromTop,
    distractorCount: 0,
    targets: FISH,
    distractors: DRIFT,
    direction: 'down',
  }).map((s, k) => ({ ...s, id: main.length + k }));

  return currentLayout([...main, ...fromTop], level, random);
}

/** The fish drawings, whichever way they swim. */
export const isFish = (spec: Pick<FallerSpec, 'art'>) => FISH.some((f) => f.art === spec.art);
