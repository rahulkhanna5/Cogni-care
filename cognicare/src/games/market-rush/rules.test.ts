import { advance, createEngine, tap, type FallerSpec } from '@/games/shared/falling';
import { createClock, isOverBasket, setPaused, shoppingDone, stillOnList, tickClock } from './rules';

const spec = (id: number, kind: FallerSpec['kind'], spawnAtMs: number): FallerSpec => ({
  id,
  kind,
  label: kind === 'target' ? 'Bread' : 'Soap',
  art: kind === 'target' ? 'bread' : 'soap',
  x: 0.5,
  spawnAtMs,
  travelMs: 1000,
  direction: 'down',
});

describe('the game clock', () => {
  it('runs with real time', () => {
    const clock = createClock(1000);
    expect(tickClock(clock, 1500)).toBe(500);
  });

  it('stands still while an item is held, then carries on from where it stopped', () => {
    const clock = createClock(0);
    tickClock(clock, 400);
    setPaused(clock, true, 400);
    expect(tickClock(clock, 3000)).toBe(400); // a slow, 2.6-second drag
    setPaused(clock, false, 3000);
    expect(tickClock(clock, 3100)).toBe(500);
  });

  it('makes reaction time "until picked up", however long the drag took', () => {
    const state = advance(createEngine(10_000, [spec(0, 'target', 0)]), 300);
    const clock = createClock(0);
    tickClock(clock, 300);
    setPaused(clock, true, 300); // picked up at 300ms
    tap(state, 0, tickClock(clock, 2300)); // dropped two seconds later
    expect(state.latencies).toEqual([300]);
  });
});

describe('dropping on the basket', () => {
  const basket = { x: 100, y: 400, width: 150, height: 100 };

  it('counts a drop inside the basket', () => {
    expect(isOverBasket({ x: 175, y: 450 }, basket)).toBe(true);
  });

  it('forgives a release a little wide of the rim', () => {
    expect(isOverBasket({ x: 80, y: 390 }, basket)).toBe(true);
  });

  it('does not count a drop out in the aisle', () => {
    expect(isOverBasket({ x: 175, y: 200 }, basket)).toBe(false);
  });
});

describe('when a turn is over', () => {
  it('ends once every list item is in the basket, without waiting for the rest', () => {
    const state = advance(
      createEngine(10_000, [spec(0, 'target', 0), spec(1, 'target', 0), spec(2, 'distractor', 5000)]),
      100
    );
    tap(state, 0, 100);
    expect(shoppingDone(state)).toBe(false);
    tap(state, 1, 100);
    expect(shoppingDone(state)).toBe(true);
  });

  it('also ends once the last list item has gone by, and names it', () => {
    const state = createEngine(10_000, [spec(0, 'target', 0), spec(1, 'target', 0)]);
    advance(state, 100);
    tap(state, 0, 100);
    advance(state, 1200); // item 1 falls off the bottom
    expect(shoppingDone(state)).toBe(true);
    expect(stillOnList(state).map((i) => i.id)).toEqual([1]);
  });

  it('a wrong item in the basket is a false alarm, not a miss', () => {
    const state = advance(createEngine(10_000, [spec(0, 'target', 0), spec(1, 'distractor', 0)]), 100);
    tap(state, 1, 100);
    expect(state.falseAlarms).toBe(1);
    expect(state.misses).toBe(0);
    expect(shoppingDone(state)).toBe(false);
  });
});

/* ---------------------------------- lanes --------------------------------- */

import { schedule } from '@/games/shared/falling';
import { GROCERIES, MARKET_LEVELS } from './levels';
import { ITEM_H, ITEM_W, laneLayout, SHELF_H } from './rules';

/** Small seeded PRNG, so every run checks the same rounds. */
function seeded(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function round(levelIndex: number, seed: number) {
  const spec = MARKET_LEVELS[levelIndex];
  const random = seeded(seed);
  const chosen = GROCERIES.slice(0, spec.listSize);
  const raw = schedule({
    durationMs: spec.durationMs,
    travelMs: spec.travelMs,
    targetCount: chosen.length,
    distractorCount: Math.round(chosen.length * spec.distractorRatio),
    targets: chosen,
    distractors: GROCERIES.slice(spec.listSize),
    random,
  });
  return { spec, specs: laneLayout(raw, { windowMs: spec.durationMs - spec.travelMs, random }) };
}

/**
 * The smallest phone the app supports: 320dp wide, a short screen. Board
 * 288 × 430 once the header, prompt and gutters are taken off — the tightest
 * both across and down, so if nothing overlaps here it overlaps nowhere.
 */
const BOARD = { width: 288, height: 430 };

function boxesAt(specs: ReturnType<typeof laneLayout>, t: number) {
  const travel = BOARD.height - SHELF_H - ITEM_H;
  return specs
    .filter((s) => t >= s.spawnAtMs && t < s.spawnAtMs + s.travelMs)
    .map((s) => ({
      id: s.id,
      x: s.x * (BOARD.width - ITEM_W),
      y: ((t - s.spawnAtMs) / s.travelMs) * travel,
    }));
}

const overlap = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  a.x < b.x + ITEM_W && b.x < a.x + ITEM_W && a.y < b.y + ITEM_H && b.y < a.y + ITEM_H;

describe('the aisle never stacks one item on another', () => {
  it.each(MARKET_LEVELS.map((_, i) => i + 1))('level %i, twenty different rounds', (level) => {
    for (let seed = 1; seed <= 20; seed++) {
      const { specs } = round(level - 1, seed);
      const end = Math.max(...specs.map((s) => s.spawnAtMs + s.travelMs));
      for (let t = 0; t <= end; t += 40) {
        const boxes = boxesAt(specs, t);
        for (let i = 0; i < boxes.length; i++)
          for (let j = i + 1; j < boxes.length; j++)
            expect({ t, a: boxes[i].id, b: boxes[j].id, overlap: overlap(boxes[i], boxes[j]) }).toEqual(
              expect.objectContaining({ overlap: false })
            );
      }
    }
  });

  it('keeps every item, each list item exactly once, and all in time to be caught', () => {
    for (let level = 0; level < MARKET_LEVELS.length; level++) {
      const { spec, specs } = round(level, 7);
      expect(specs).toHaveLength(Math.round(spec.listSize * (1 + spec.distractorRatio)));
      const targets = specs.filter((s) => s.kind === 'target').map((s) => s.label);
      expect(new Set(targets).size).toBe(spec.listSize);
      for (const s of specs) expect(s.spawnAtMs).toBeLessThanOrEqual(spec.durationMs - spec.travelMs);
    }
  });

  it('still varies where things appear', () => {
    const { specs } = round(0, 3);
    expect(new Set(specs.map((s) => Math.round(s.x * 10))).size).toBeGreaterThan(1);
  });
});
