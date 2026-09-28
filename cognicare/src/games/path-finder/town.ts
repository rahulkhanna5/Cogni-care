/**
 * Path Finder's town: a square grid of crossroads joined by roads, grass
 * blocks between them holding the buildings, and road blocks on some roads.
 *
 * Pure — no React — so every rule here is tested without a render tree.
 *
 * A route is a list of crossroads. The player extends it one crossroad at a
 * time, only along a road that is open; the trip ends at the destination's
 * door. Every town is generated with a way through, however many roads are
 * blocked.
 */

export type Node = { r: number; c: number };
export type Place = 'home' | 'hospital' | 'school' | 'police';
export type Scenery = 'house-blue' | 'house-green' | 'house-tall' | 'trees';
export type Blocker = 'broken' | 'accident' | 'construction';

export type Town = {
  /** crossroads along each side */
  n: number;
  /** the (n-1)×(n-1) grass blocks between the roads, row by row */
  cells: (Place | Scenery)[][];
  home: { cell: Node; door: Node };
  destination: { place: Exclude<Place, 'home'>; cell: Node; door: Node };
  /** blocked roads, by edgeKey */
  blocks: Record<string, Blocker>;
};

export type TownLevel = {
  /** crossroads along each side */
  n: number;
  /** road blocks at the start of a trip */
  blocks: number;
  /** how many of them sit on what would otherwise be the shortest way */
  onRoute: number;
};

export const same = (a: Node, b: Node) => a.r === b.r && a.c === b.c;

/** One key per road, whichever end it is named from. */
export const edgeKey = (a: Node, b: Node) =>
  a.r < b.r || (a.r === b.r && a.c < b.c) ? `${a.r},${a.c}|${b.r},${b.c}` : `${b.r},${b.c}|${a.r},${a.c}`;

export const isNeighbour = (a: Node, b: Node) => Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;

export function neighbours(n: number, at: Node): Node[] {
  return [
    { r: at.r - 1, c: at.c },
    { r: at.r + 1, c: at.c },
    { r: at.r, c: at.c - 1 },
    { r: at.r, c: at.c + 1 },
  ].filter((p) => p.r >= 0 && p.c >= 0 && p.r < n && p.c < n);
}

/** The shortest way along open roads, both ends included; null if there is none. */
export function shortestWay(n: number, blocks: Record<string, Blocker>, from: Node, to: Node): Node[] | null {
  const key = (p: Node) => p.r * n + p.c;
  const previous = new Map<number, Node | null>([[key(from), null]]);
  const queue: Node[] = [from];
  while (queue.length) {
    const at = queue.shift()!;
    if (same(at, to)) {
      const way: Node[] = [];
      for (let p: Node | null = at; p; p = previous.get(key(p)) ?? null) way.unshift(p);
      return way;
    }
    for (const next of neighbours(n, at)) {
      if (previous.has(key(next)) || blocks[edgeKey(at, next)]) continue;
      previous.set(key(next), at);
      queue.push(next);
    }
  }
  return null;
}

/** Roads in the shortest way — one fewer than its crossroads. */
export const roadsIn = (way: Node[]) => Math.max(0, way.length - 1);

export type Step = 'ok' | 'blocked' | 'not-next' | 'visited';

/** Whether the route may go on to `next`, and if not, why not. */
export function canStep(town: Town, route: Node[], next: Node): Step {
  const at = route[route.length - 1];
  if (!isNeighbour(at, next)) return 'not-next';
  if (town.blocks[edgeKey(at, next)]) return 'blocked';
  if (route.some((p) => same(p, next))) return 'visited';
  return 'ok';
}

/** 1 for the shortest way, less for each extra road, 0 if not there yet. */
export function tripAccuracy(route: Node[], to: Node, shortest: number): number {
  const last = route[route.length - 1];
  if (!last || !same(last, to)) return 0;
  return Math.max(0, Math.min(1, shortest / roadsIn(route)));
}

/* ------------------------------- generating ------------------------------- */

const BLOCKERS: Blocker[] = ['broken', 'accident', 'construction'];
const SCENERY: Scenery[] = ['house-blue', 'house-green', 'house-tall', 'trees'];

const pick = <T,>(items: T[], rnd: () => number) => items[Math.floor(rnd() * items.length) % items.length];

/** Every road in the town. */
function allRoads(n: number): [Node, Node][] {
  const roads: [Node, Node][] = [];
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) {
      if (c + 1 < n) roads.push([{ r, c }, { r, c: c + 1 }]);
      if (r + 1 < n) roads.push([{ r, c }, { r: r + 1, c }]);
    }
  return roads;
}

/** n choose k — how many shortest ways cross an open grid. */
function choose(n: number, k: number): number {
  let out = 1;
  for (let i = 1; i <= k; i++) out = (out * (n - k + i)) / i;
  return Math.round(out);
}

/** The options with the fewest shortest ways, give or take a little for variety. */
function narrowest<T>(options: T[], ways: (o: T) => number): T[] {
  const least = Math.min(...options.map(ways));
  return options.filter((o) => ways(o) <= least * 2);
}

/**
 * Roads on some shortest way, busiest first: a road's count is how many
 * shortest ways use it (ways to reach its near end × ways on from its far end).
 */
function busiestRoads(n: number, blocks: Record<string, Blocker>, from: Node, to: Node): [Node, Node][] {
  const bfs = (start: Node) => {
    const dist = new Map<string, number>([[`${start.r},${start.c}`, 0]]);
    const count = new Map<string, number>([[`${start.r},${start.c}`, 1]]);
    const queue = [start];
    while (queue.length) {
      const at = queue.shift()!;
      const d = dist.get(`${at.r},${at.c}`)!;
      for (const next of neighbours(n, at)) {
        if (blocks[edgeKey(at, next)]) continue;
        const k = `${next.r},${next.c}`;
        if (!dist.has(k)) {
          dist.set(k, d + 1);
          count.set(k, 0);
          queue.push(next);
        }
        if (dist.get(k) === d + 1) count.set(k, count.get(k)! + count.get(`${at.r},${at.c}`)!);
      }
    }
    return { dist, count };
  };
  const a = bfs(from);
  const b = bfs(to);
  const total = a.dist.get(`${to.r},${to.c}`);
  if (total === undefined) return [];

  const scored: { road: [Node, Node]; uses: number }[] = [];
  for (const [u, v] of allRoads(n)) {
    if (blocks[edgeKey(u, v)]) continue;
    for (const [p, q] of [
      [u, v],
      [v, u],
    ]) {
      const dp = a.dist.get(`${p.r},${p.c}`);
      const dq = b.dist.get(`${q.r},${q.c}`);
      if (dp !== undefined && dq !== undefined && dp + 1 + dq === total)
        scored.push({ road: [u, v], uses: a.count.get(`${p.r},${p.c}`)! * b.count.get(`${q.r},${q.c}`)! });
    }
  }
  return scored.sort((x, y) => y.uses - x.uses).map((s) => s.road);
}

/**
 * A town for one outing: home in the bottom-left block, the destination in a
 * far block, `onRoute` blocks placed on the shortest way (so the obvious
 * route is not the answer), the rest anywhere — always leaving a way through.
 */
export function generateTown(
  level: TownLevel,
  place: Exclude<Place, 'home'>,
  rnd: () => number = Math.random
): Town {
  const { n } = level;
  const size = n - 1; // grass blocks per side

  const homeCell: Node = { r: size - 1, c: 0 };
  const homeDoor: Node = { r: homeCell.r + 1, c: homeCell.c };
  const distance = (p: Node) => Math.abs(p.r - homeDoor.r) + Math.abs(p.c - homeDoor.c);

  // Every far block, and each of its four corners as a possible door.
  const options: { cell: Node; door: Node }[] = [];
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++) {
      if ((r === homeCell.r && c === homeCell.c) || Math.abs(r - homeCell.r) + Math.abs(c - homeCell.c) < size - 1)
        continue;
      for (const door of [
        { r, c },
        { r, c: c + 1 },
        { r: r + 1, c },
        { r: r + 1, c: c + 1 },
      ])
        if (distance(door) >= n) options.push({ cell: { r, c }, door });
    }

  // Corner to far corner has dozens of equally short ways, and no handful of
  // blocks can make any of them longer. When a level puts blocks on the way,
  // the destination goes where the short ways are few — straight up, or
  // straight across — so a block there genuinely means going round.
  const ways = (o: { door: Node }) => choose(distance(o.door), Math.abs(o.door.r - homeDoor.r));
  const pool = level.onRoute > 0 ? narrowest(options, ways) : options;
  const { cell: destCell, door: destDoor } = pick(pool, rnd);
  const cells: (Place | Scenery)[][] = Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) =>
      r === homeCell.r && c === homeCell.c ? 'home' : r === destCell.r && c === destCell.c ? place : pick(SCENERY, rnd)
    )
  );

  const blocks: Record<string, Blocker> = {};
  const reachable = () => shortestWay(n, blocks, homeDoor, destDoor) !== null;
  const tryBlock = (a: Node, b: Node) => {
    const key = edgeKey(a, b);
    if (blocks[key]) return false;
    blocks[key] = pick(BLOCKERS, rnd);
    if (reachable()) return true;
    delete blocks[key];
    return false;
  };

  const roads = allRoads(n);

  // On the way first: each on the road the most shortest ways share, so the
  // route a player would take without looking really is cut. (A block on
  // just any one shortest way rarely forced a detour: 14 towns in 40.)
  for (let k = 0; k < level.onRoute; k++) {
    const busiest = [...busiestRoads(n, blocks, homeDoor, destDoor)];
    for (const [a, b] of busiest) if (tryBlock(a, b)) break;
  }

  for (let tries = 0; Object.keys(blocks).length < level.blocks && tries < 200; tries++) tryBlock(...pick(roads, rnd));

  return { n, cells, home: { cell: homeCell, door: homeDoor }, destination: { place, cell: destCell, door: destDoor }, blocks };
}

/**
 * The trip home, after an accident on a road the player just used — the
 * route that worked is no longer the way back, so it has to be re-planned.
 * Picks a road of theirs that still leaves a way home; if every one of them
 * is the only way through, no new block is added.
 */
export function blockOnReturn(town: Town, route: Node[], rnd: () => number = Math.random): Town {
  const roads = route.slice(1).map((p, i) => [route[i], p] as [Node, Node]);
  const order = [...roads].sort(() => rnd() - 0.5);
  for (const [a, b] of order) {
    const key = edgeKey(a, b);
    if (town.blocks[key]) continue;
    const blocks = { ...town.blocks, [key]: 'accident' as Blocker };
    if (shortestWay(town.n, blocks, town.destination.door, town.home.door)) return { ...town, blocks };
  }
  return town;
}

/** Which place each turn of a session goes to. */
export const PLACE_FOR_TURN: Exclude<Place, 'home'>[] = ['hospital', 'school', 'police'];
export const placeForTurn = (roundNo: number) => PLACE_FOR_TURN[(roundNo - 1) % PLACE_FOR_TURN.length];

export const PLACE_NAME: Record<Place, string> = {
  home: 'Home',
  hospital: 'Hospital',
  school: 'School',
  police: 'Police station',
};
