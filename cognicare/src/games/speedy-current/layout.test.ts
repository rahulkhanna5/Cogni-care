import { schedule, type FallerSpec } from '@/games/shared/falling';
import { endOf } from '@/games/shared/lanes';
import { CURRENT_LEVELS, DRIFT, FISH, PREDATORS } from './levels';
import { currentLayout, SPRITE_H, SPRITE_W } from './layout';

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
  const random = seeded(seed);
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
    random,
  });
  return { spec, raw, specs: currentLayout(raw, spec, random) };
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

  it('keeps every fish, shark and leaf, each going the way it was meant to', () => {
    for (let level = 0; level < CURRENT_LEVELS.length; level++) {
      const { spec, raw, specs } = round(level, 5);
      expect(specs).toHaveLength(spec.targetCount + spec.distractorCount + spec.forbiddenCount);
      const byId = new Map(raw.map((s) => [s.id, s]));
      for (const s of specs) {
        expect(s.direction).toBe(byId.get(s.id)!.direction);
        expect(s.kind).toBe(byId.get(s.id)!.kind);
      }
    }
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
