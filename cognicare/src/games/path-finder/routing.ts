export type Cell = { r: number; c: number };

export type MapSpec = {
  size: number;
  blocked: boolean[][];
  start: Cell;
  goal: Cell;
  /** Fewest steps from start to goal. */
  optimal: number;
};

export const same = (a: Cell, b: Cell) => a.r === b.r && a.c === b.c;

/** Orthogonally adjacent only — diagonal moves would make "shortest" ambiguous. */
export const isAdjacent = (a: Cell, b: Cell) =>
  Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;

export function shortestPath(
  size: number,
  blocked: boolean[][],
  start: Cell,
  goal: Cell
): number | null {
  const seen = Array.from({ length: size }, () => Array(size).fill(false));
  const queue: { cell: Cell; steps: number }[] = [{ cell: start, steps: 0 }];
  seen[start.r][start.c] = true;

  while (queue.length) {
    const { cell, steps } = queue.shift()!;
    if (same(cell, goal)) return steps;

    for (const [dr, dc] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const r = cell.r + dr;
      const c = cell.c + dc;
      if (r < 0 || c < 0 || r >= size || c >= size) continue;
      if (seen[r][c] || blocked[r][c]) continue;
      seen[r][c] = true;
      queue.push({ cell: { r, c }, steps: steps + 1 });
    }
  }

  return null;
}

/**
 * Generates a solvable map. Retries rather than repairing: an unsolvable
 * layout shown to the player is the one failure mode this game cannot have.
 */
export function generateMap(size: number, blockedRatio: number, rnd = Math.random): MapSpec {
  for (let attempt = 0; attempt < 200; attempt++) {
    const blocked = Array.from({ length: size }, () => Array<boolean>(size).fill(false));

    const start: Cell = { r: size - 1, c: 0 };
    const goal: Cell = { r: 0, c: size - 1 };

    const cells = size * size;
    const wanted = Math.floor(cells * blockedRatio);
    let placed = 0;
    let guard = 0;

    while (placed < wanted && guard++ < cells * 10) {
      const r = Math.floor(rnd() * size);
      const c = Math.floor(rnd() * size);
      const cell = { r, c };
      if (same(cell, start) || same(cell, goal) || blocked[r][c]) continue;
      blocked[r][c] = true;
      placed++;
    }

    const optimal = shortestPath(size, blocked, start, goal);
    // Reject trivially short routes too — a straight line teaches nothing.
    if (optimal != null && optimal >= size) {
      return { size, blocked, start, goal, optimal };
    }
  }

  // Fallback: empty grid is always solvable.
  const blocked = Array.from({ length: size }, () => Array<boolean>(size).fill(false));
  const start: Cell = { r: size - 1, c: 0 };
  const goal: Cell = { r: 0, c: size - 1 };
  return { size, blocked, start, goal, optimal: shortestPath(size, blocked, start, goal)! };
}

/** Whether `next` may be appended to `path`. */
export function canExtend(map: MapSpec, path: Cell[], next: Cell): boolean {
  if (next.r < 0 || next.c < 0 || next.r >= map.size || next.c >= map.size) return false;
  if (map.blocked[next.r][next.c]) return false;
  if (path.some((p) => same(p, next))) return false; // no revisiting
  return isAdjacent(path[path.length - 1], next);
}

/** 1.0 for an optimal route, scaled down for detours, 0 if the goal is unreached. */
export function routeAccuracy(map: MapSpec, path: Cell[]): number {
  const last = path[path.length - 1];
  if (!last || !same(last, map.goal)) return 0;
  const steps = path.length - 1;
  return Math.max(0, Math.min(1, map.optimal / steps));
}
