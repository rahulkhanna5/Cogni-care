/**
 * Where and when each falling or rising item enters, so no two ever overlap.
 *
 * `schedule` draws position and entry time independently at random, so two
 * items could enter together at nearly the same spot and travel stacked — the
 * one underneath unreadable, and unreachable for a finger. Here the board is
 * split into lanes as wide as an item, and items are spread through the turn
 * in random order, each taking a random lane that is free for it:
 *
 * - behind an item going the SAME way, once that one is `followGap` of its
 *   crossing ahead. Everything moves at one speed, so the gap then holds;
 * - never while an item going the OTHER way is still in the lane — head-on,
 *   they would pass through each other. Lanes change direction as they empty,
 *   so where an item appears never tells the player which way it will go.
 *
 * If no lane is free, the item waits until one is. Items keep their order,
 * so the turn may run a little past `windowMs`; `endOf` says how far, and the
 * caller lengthens the turn to match rather than cut the last items off.
 */

import type { FallerSpec } from './falling';

export type LaneOptions = {
  /** Entry times are spread across 0..windowMs. */
  windowMs: number;
  random: () => number;
  lanes: number;
  /** Share of an item's crossing that a lane stays closed behind it. */
  followGap: number;
};

export function laneLayout(specs: FallerSpec[], opts: LaneOptions): FallerSpec[] {
  const { windowMs, random, lanes, followGap } = opts;
  const n = specs.length;
  if (n === 0) return specs;

  // Random order of appearance — a Fisher-Yates shuffle.
  const order = [...specs];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }

  const slot = windowMs / n;
  // Per lane and direction: when the last item entered, and when it left.
  const entered = Array.from({ length: lanes }, () => ({ up: -Infinity, down: -Infinity }));
  const left = Array.from({ length: lanes }, () => ({ up: -Infinity, down: -Infinity }));
  let previous = 0;

  return order.map((spec, i) => {
    const dir = spec.direction;
    const other = dir === 'up' ? 'down' : 'up';
    /** The earliest this item could enter lane `l`. */
    const freeAt = (l: number) =>
      Math.max(entered[l][dir] + followGap * spec.travelMs, left[l][other]);

    // Evenly spread, nudged a little so the rhythm is not metronomic, and
    // never before the item ahead of it in the order.
    let at = Math.max(previous, Math.min(windowMs, Math.round(i * slot + random() * slot * 0.5)));
    const open = entered.map((_, l) => l).filter((l) => freeAt(l) <= at);

    let lane: number;
    if (open.length) {
      lane = open[Math.floor(random() * open.length)];
    } else {
      lane = entered.map((_, l) => l).reduce((a, b) => (freeAt(b) < freeAt(a) ? b : a));
      at = Math.ceil(freeAt(lane));
    }

    entered[lane][dir] = at;
    left[lane][dir] = Math.max(left[lane][dir], at + spec.travelMs);
    previous = at;
    return { ...spec, spawnAtMs: at, x: lanes === 1 ? 0.5 : lane / (lanes - 1) };
  });
}

/** When the last item has finished crossing. */
export const endOf = (specs: FallerSpec[]) =>
  specs.reduce((end, s) => Math.max(end, s.spawnAtMs + s.travelMs), 0);
