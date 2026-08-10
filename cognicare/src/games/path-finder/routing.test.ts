import { canExtend, generateMap, routeAccuracy, shortestPath, type MapSpec } from './routing';

const empty = (size: number) =>
  Array.from({ length: size }, () => Array<boolean>(size).fill(false));

describe('shortestPath', () => {
  it('measures the Manhattan distance on an open grid', () => {
    expect(shortestPath(4, empty(4), { r: 3, c: 0 }, { r: 0, c: 3 })).toBe(6);
  });

  it('routes around an obstacle', () => {
    const blocked = empty(3);
    blocked[1][1] = true;
    expect(shortestPath(3, blocked, { r: 2, c: 0 }, { r: 0, c: 2 })).toBe(4);
  });

  it('returns null when the goal is walled off', () => {
    const blocked = empty(3);
    blocked[0][1] = true;
    blocked[1][2] = true;
    blocked[1][1] = true;
    expect(shortestPath(3, blocked, { r: 2, c: 0 }, { r: 0, c: 2 })).toBeNull();
  });
});

describe('generateMap', () => {
  it('always produces a solvable map with a non-trivial route', () => {
    let seed = 7;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);

    for (let i = 0; i < 40; i++) {
      const map = generateMap(6, 0.2, rnd);
      const solvable = shortestPath(map.size, map.blocked, map.start, map.goal);
      expect(solvable).not.toBeNull();
      expect(map.optimal).toBe(solvable);
      expect(map.optimal).toBeGreaterThanOrEqual(map.size);
    }
  });

  it('never blocks the start or the goal', () => {
    for (let i = 0; i < 20; i++) {
      const map = generateMap(5, 0.3);
      expect(map.blocked[map.start.r][map.start.c]).toBe(false);
      expect(map.blocked[map.goal.r][map.goal.c]).toBe(false);
    }
  });
});

describe('canExtend', () => {
  const map: MapSpec = {
    size: 3,
    blocked: (() => {
      const b = empty(3);
      b[1][1] = true;
      return b;
    })(),
    start: { r: 2, c: 0 },
    goal: { r: 0, c: 2 },
    optimal: 4,
  };

  it('accepts an adjacent free cell', () => {
    expect(canExtend(map, [{ r: 2, c: 0 }], { r: 1, c: 0 })).toBe(true);
  });

  it('rejects a diagonal move', () => {
    expect(canExtend(map, [{ r: 2, c: 0 }], { r: 1, c: 1 })).toBe(false);
  });

  it('rejects a blocked cell', () => {
    expect(canExtend(map, [{ r: 2, c: 1 }], { r: 1, c: 1 })).toBe(false);
  });

  it('rejects revisiting a cell already on the path', () => {
    const path = [
      { r: 2, c: 0 },
      { r: 1, c: 0 },
    ];
    expect(canExtend(map, path, { r: 2, c: 0 })).toBe(false);
  });

  it('rejects stepping outside the grid', () => {
    expect(canExtend(map, [{ r: 0, c: 0 }], { r: -1, c: 0 })).toBe(false);
  });
});

describe('routeAccuracy', () => {
  const map: MapSpec = {
    size: 3,
    blocked: empty(3),
    start: { r: 2, c: 0 },
    goal: { r: 0, c: 2 },
    optimal: 4,
  };

  it('scores an optimal route 1', () => {
    const path = [
      { r: 2, c: 0 },
      { r: 1, c: 0 },
      { r: 0, c: 0 },
      { r: 0, c: 1 },
      { r: 0, c: 2 },
    ];
    expect(routeAccuracy(map, path)).toBe(1);
  });

  it('scales a detour down', () => {
    const path = [
      { r: 2, c: 0 },
      { r: 2, c: 1 },
      { r: 2, c: 2 },
      { r: 1, c: 2 },
      { r: 1, c: 1 },
      { r: 0, c: 1 },
      { r: 0, c: 2 },
    ];
    expect(routeAccuracy(map, path)).toBeCloseTo(4 / 6);
  });

  it('scores 0 when the goal was never reached', () => {
    expect(routeAccuracy(map, [{ r: 2, c: 0 }, { r: 1, c: 0 }])).toBe(0);
  });
});
