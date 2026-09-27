/**
 * The rules Market Rush adds on top of the shared falling engine: a clock
 * that stops while an item is held, the basket as a drop target, and when a
 * turn is over. Pure, like falling.ts, so it is tested without a render tree.
 */

import type { EngineState, Faller, FallerSpec } from '@/games/shared/falling';
import { laneLayout as sharedLaneLayout } from '@/games/shared/lanes';

/* ---------------------------------- clock --------------------------------- */

/**
 * Game time, which stands still while the player carries an item.
 *
 * Dragging takes an older or unsteady hand a second or more. If the aisle
 * kept moving meanwhile, a slow hand would miss list items it had remembered
 * perfectly well — the score would measure dexterity, not memory. Game time
 * also makes reaction time "until picked up": the drop happens at the same
 * game instant as the pickup, so it stays comparable with a plain tap.
 */
export type Clock = { elapsed: number; last: number; paused: boolean };

export const createClock = (realNow: number): Clock => ({ elapsed: 0, last: realNow, paused: false });

/** Bring game time up to `realNow` and return it. */
export function tickClock(clock: Clock, realNow: number): number {
  if (!clock.paused) clock.elapsed += realNow - clock.last;
  clock.last = realNow;
  return clock.elapsed;
}

export function setPaused(clock: Clock, paused: boolean, realNow: number): void {
  tickClock(clock, realNow);
  clock.paused = paused;
}

/* --------------------------------- basket --------------------------------- */

export type Box = { x: number; y: number; width: number; height: number };

/**
 * How far outside the basket a drop still counts. A shaky release a little
 * wide of the rim should land in the basket, not bounce back into the aisle.
 */
export const DROP_SLOP = 28;

export function isOverBasket(point: { x: number; y: number }, basket: Box, slop = DROP_SLOP): boolean {
  return (
    point.x >= basket.x - slop &&
    point.x <= basket.x + basket.width + slop &&
    point.y >= basket.y - slop &&
    point.y <= basket.y + basket.height + slop
  );
}

/* ---------------------------------- turn ---------------------------------- */

const isTarget = (i: Faller) => i.kind === 'target';

/**
 * The turn is over once every list item is either in the basket or gone.
 * What is still falling after that can only be a wrong pick, so waiting for
 * it would just be time spent inviting errors.
 */
export function shoppingDone(state: EngineState): boolean {
  const targets = state.items.filter(isTarget);
  return targets.length > 0 && targets.every((i) => i.status === 'tapped' || i.status === 'expired');
}

/** List items that went by without being picked — named at the end of a turn. */
export const stillOnList = (state: EngineState): Faller[] =>
  state.items.filter((i) => isTarget(i) && i.status === 'expired');

/* ---------------------------------- lanes --------------------------------- */

/** A framed item card, and the strip at the bottom that belongs to the basket. */
export const ITEM_W = 96;
export const ITEM_H = 84;
export const SHELF_H = 120; // the 104dp basket plus a 16dp margin

/** Three lanes fit three 96dp cards across even a 320dp phone. */
export const LANES = 3;

/**
 * How long a lane stays closed behind an item, as a share of its fall.
 * The fall on the shortest supported screen is 226dp; an 84dp card plus a
 * margin needs 41% of it. Every item falls at the same speed, so once apart,
 * two items in a lane stay apart — and pausing while one is held pauses all.
 */
export const LANE_GAP = 0.45;

/**
 * Market Rush's lanes: the shared layout (see shared/lanes.ts) with three
 * lanes and this game's gap. Everything here falls, so no item ever waits:
 * the two items before one hold at most two lanes, so the third was last used
 * three slots ago, and every level leaves at least 2.5 slots >= LANE_GAP.
 */
export const laneLayout = (
  specs: FallerSpec[],
  opts: { windowMs: number; random: () => number; lanes?: number; gap?: number }
): FallerSpec[] =>
  sharedLaneLayout(specs, {
    windowMs: opts.windowMs,
    random: opts.random,
    lanes: opts.lanes ?? LANES,
    followGap: opts.gap ?? LANE_GAP,
  });
