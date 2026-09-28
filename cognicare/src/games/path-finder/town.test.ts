import { PATH_LEVELS } from './levels';
import {
  blockOnReturn,
  canStep,
  edgeKey,
  generateTown,
  placeForTurn,
  roadsIn,
  shortestWay,
  tripAccuracy,
  type Node,
} from './town';

/** Small seeded PRNG, so every run checks the same towns. */
function seeded(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('every generated town', () => {
  it.each(PATH_LEVELS.map((_, i) => i + 1))('level %i: has a way there and the right number of blocks', (level) => {
    const spec = PATH_LEVELS[level - 1];
    for (let seed = 1; seed <= 40; seed++) {
      const town = generateTown(spec, 'hospital', seeded(seed));
      expect(Object.keys(town.blocks)).toHaveLength(spec.blocks);
      expect(shortestWay(town.n, town.blocks, town.home.door, town.destination.door)).not.toBeNull();
      expect(town.cells.flat().filter((c) => c === 'home')).toHaveLength(1);
      expect(town.cells.flat().filter((c) => c === 'hospital')).toHaveLength(1);
    }
  });

  it('puts the destination far enough away to need a real route', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const town = generateTown(PATH_LEVELS[0], 'school', seeded(seed));
      const way = shortestWay(town.n, {}, town.home.door, town.destination.door)!;
      expect(roadsIn(way)).toBeGreaterThanOrEqual(town.n); // at least across and up
    }
  });

  it('blocks the obvious way when a level says so, forcing a detour more often than not', () => {
    const spec = PATH_LEVELS[11]; // 3 blocks on the way
    let detours = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const town = generateTown(spec, 'police', seeded(seed));
      const open = roadsIn(shortestWay(town.n, {}, town.home.door, town.destination.door)!);
      const now = roadsIn(shortestWay(town.n, town.blocks, town.home.door, town.destination.door)!);
      expect(now).toBeGreaterThanOrEqual(open);
      if (now > open) detours++;
    }
    expect(detours).toBeGreaterThan(20);
  });
});

describe('walking the roads', () => {
  const town = generateTown({ n: 3, blocks: 0, onRoute: 0 }, 'hospital', seeded(1));
  const start = town.home.door; // bottom-left, (2, 0)

  it('goes on only to a crossroad next to where you are', () => {
    expect(canStep(town, [start], { r: 1, c: 0 })).toBe('ok');
    expect(canStep(town, [start], { r: 0, c: 0 })).toBe('not-next');
    expect(canStep(town, [start], { r: 1, c: 1 })).toBe('not-next'); // no diagonals
  });

  it('refuses a blocked road, and says so', () => {
    const blocked = { ...town, blocks: { [edgeKey(start, { r: 1, c: 0 })]: 'broken' as const } };
    expect(canStep(blocked, [start], { r: 1, c: 0 })).toBe('blocked');
  });

  it('does not walk back over the route', () => {
    expect(canStep(town, [start, { r: 1, c: 0 }], start)).toBe('visited');
  });

  it('scores the shortest way 1, and less for each extra road', () => {
    const to: Node = { r: 0, c: 2 };
    const shortest = [start, { r: 1, c: 0 }, { r: 0, c: 0 }, { r: 0, c: 1 }, to];
    expect(tripAccuracy(shortest, to, 4)).toBe(1);
    const longer = [start, { r: 2, c: 1 }, { r: 1, c: 1 }, { r: 1, c: 0 }, { r: 0, c: 0 }, { r: 0, c: 1 }, to];
    expect(tripAccuracy(longer, to, 4)).toBeCloseTo(4 / 6);
    expect(tripAccuracy([start], to, 4)).toBe(0);
  });
});

describe('the trip home', () => {
  it('blocks a road you just used, and still leaves a way home', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const rnd = seeded(seed);
      const town = generateTown(PATH_LEVELS[7], 'school', rnd);
      const route = shortestWay(town.n, town.blocks, town.home.door, town.destination.door)!;
      const back = blockOnReturn(town, route, rnd);
      const added = Object.keys(back.blocks).filter((k) => !town.blocks[k]);
      if (added.length) {
        expect(added).toHaveLength(1);
        const used = route.slice(1).map((p, i) => edgeKey(route[i], p));
        expect(used).toContain(added[0]);
        expect(back.blocks[added[0]]).toBe('accident');
      }
      expect(shortestWay(back.n, back.blocks, back.destination.door, back.home.door)).not.toBeNull();
    }
  });
});

it('goes to the hospital, then the school, then the police station', () => {
  expect([1, 2, 3].map(placeForTurn)).toEqual(['hospital', 'school', 'police']);
});

it('grows the town fast: 3×3 crossroads, then 4×4, then 5×5 from level 3', () => {
  expect(PATH_LEVELS.slice(0, 4).map((l) => l.n)).toEqual([3, 4, 5, 5]);
  for (const l of PATH_LEVELS.slice(2)) expect(l.n).toBe(5);
  // Past level 3 the blocks carry the difficulty, never fewer than before.
  PATH_LEVELS.forEach((l, i) => i > 0 && expect(l.blocks).toBeGreaterThanOrEqual(PATH_LEVELS[i - 1].blocks));
});
