import { schedule, type FallerSpec } from '@/games/shared/falling';
import { endOf } from '@/games/shared/lanes';
import { CURRENT_LEVELS, DRIFT, FISH, PREDATORS } from './levels';
import { currentRound, isFish, SPRITE_H, SPRITE_W } from './layout';

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
  const spec = CURRENT_LEVELS[levelIndex];
  // The old layout — random place, random time — kept only to show the
  // overlap test can see the problem it guards against.
  const old = seeded(seed);
  const raw = schedule({
    durationMs: spec.durationMs,
    travelMs: spec.travelMs,
    targetCount: spec.targetCount,
    distractorCount: spec.distractorCount,
    forbiddenCount: spec.forbiddenCount,
    targets: FISH,
    distractors: DRIFT,
    forbidden: PREDATORS,
    direction: 'up',
    distractorDirection: 'down',
    random: old,
  });
  return { spec, raw, specs: currentRound(spec, seeded(seed)) };
}

/**
 * The smallest phone the app supports, 320dp wide, with the two-line shark
 * prompt: a 288 × 400 board, the tightest across and down.
 */
const BOARD = { width: 288, height: 400 };

function boxesAt(specs: FallerSpec[], t: number) {
  const range = BOARD.height - SPRITE_H;
  return specs
    .filter((s) => t >= s.spawnAtMs && t < s.spawnAtMs + s.travelMs)
    .map((s) => {
      const p = (t - s.spawnAtMs) / s.travelMs;
      return { id: s.id, x: s.x * (BOARD.width - SPRITE_W), y: (s.direction === 'down' ? p : 1 - p) * range };
    });
}

const overlap = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  a.x < b.x + SPRITE_W && b.x < a.x + SPRITE_W && a.y < b.y + SPRITE_H && b.y < a.y + SPRITE_H;

function overlaps(specs: FallerSpec[]) {
  const found: string[] = [];
  for (let t = 0; t <= endOf(specs); t += 25) {
    const boxes = boxesAt(specs, t);
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++)
        if (overlap(boxes[i], boxes[j])) found.push(`t=${t} ${boxes[i].id}/${boxes[j].id}`);
  }
  return found;
}

describe('Speedy Current never stacks one item on another', () => {
  it.each(CURRENT_LEVELS.map((_, i) => i + 1))('level %i, twenty different rounds', (level) => {
    for (let seed = 1; seed <= 20; seed++) {
      expect(overlaps(round(level - 1, seed).specs)).toEqual([]);
    }
  });

  it('the old random layout did overlap — this test can see the problem', () => {
    expect(overlaps(round(0, 1).raw).length).toBeGreaterThan(0);
  });

  it('keeps every item, with a unique id', () => {
    for (let level = 0; level < CURRENT_LEVELS.length; level++) {
      const { spec, specs } = round(level, 5);
      expect(specs).toHaveLength(spec.targetCount + spec.distractorCount + spec.forbiddenCount);
      expect(new Set(specs.map((s) => s.id)).size).toBe(specs.length);
    }
  });

  it('makes every fish one to tap — some from the bottom, some from the top', () => {
    for (let level = 0; level < CURRENT_LEVELS.length; level++) {
      const { spec, specs } = round(level, 5);
      const fish = specs.filter(isFish);
      expect(fish).toHaveLength(spec.targetCount);
      for (const f of fish) expect(f.kind).toBe('target');
      expect(fish.filter((f) => f.direction === 'down')).toHaveLength(spec.fromTop);
      expect(fish.filter((f) => f.direction === 'up')).toHaveLength(spec.targetCount - spec.fromTop);
      // Everything else is something not to tap.
      for (const s of specs.filter((x) => !isFish(x))) expect(s.kind).not.toBe('target');
    }
  });

  it('sends fish from the top at every level, a few more as levels rise', () => {
    CURRENT_LEVELS.forEach((spec, i) => {
      expect(spec.fromTop).toBeGreaterThanOrEqual(2);
      expect(spec.fromTop).toBeLessThan(spec.targetCount);
      if (i > 0) expect(spec.fromTop).toBeGreaterThanOrEqual(CURRENT_LEVELS[i - 1].fromTop);
    });
  });

  it('lengthens a turn by under a second at most when an item waits for a lane', () => {
    for (let level = 0; level < CURRENT_LEVELS.length; level++) {
      for (let seed = 1; seed <= 20; seed++) {
        const { spec, specs } = round(level, seed);
        expect(endOf(specs) - spec.durationMs).toBeLessThanOrEqual(1000);
      }
    }
  });
});
