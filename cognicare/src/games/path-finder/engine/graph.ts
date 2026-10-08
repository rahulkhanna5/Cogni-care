import type { CityLevel, CityNode, NodeId, Road, Trip } from './types';

/**
 * The city as a graph — lookups plus Dijkstra. Pure, so every rule built on
 * it is tested without a render tree.
 */
export type Graph = {
  level: CityLevel;
  node: (id: NodeId) => CityNode;
  road: (id: string) => Road;
  roadsAt: (id: NodeId) => Road[];
  roadBetween: (a: NodeId, b: NodeId) => Road | undefined;
};

export function buildGraph(level: CityLevel): Graph {
  const nodes = new Map(level.nodes.map((n) => [n.id, n]));
  const roads = new Map(level.roads.map((r) => [r.id, r]));
  const at = new Map<NodeId, Road[]>(level.nodes.map((n) => [n.id, []]));
  for (const r of level.roads) {
    at.get(r.a)?.push(r);
    at.get(r.b)?.push(r);
  }
  const must = <T>(v: T | undefined, what: string): T => {
    if (v === undefined) throw new Error(`Path Finder: no ${what}`);
    return v;
  };
  return {
    level,
    node: (id) => must(nodes.get(id), `crossroad ${id}`),
    road: (id) => must(roads.get(id), `road ${id}`),
    roadsAt: (id) => at.get(id) ?? [],
    roadBetween: (a, b) => (at.get(a) ?? []).find((r) => other(r, a) === b),
  };
}

export const other = (road: Road, end: NodeId): NodeId => (road.a === end ? road.b : road.a);

export function metres(g: Graph, road: Road): number {
  if (road.gameDistance !== undefined) return road.gameDistance;
  const a = g.node(road.a);
  const b = g.node(road.b);
  return Math.round(Math.hypot(a.x - b.x, a.y - b.y) * 100);
}

/** Metres along a route; a step with no road between its ends counts nothing. */
export function routeMetres(g: Graph, route: NodeId[]): number {
  let total = 0;
  for (let i = 1; i < route.length; i++) {
    const r = g.roadBetween(route[i - 1], route[i]);
    if (r) total += metres(g, r);
  }
  return total;
}

/** Dijkstra by game distance. Both ends included; null when no way is left. */
export function shortest(g: Graph, from: NodeId, to: NodeId, avoid: (r: Road) => boolean): NodeId[] | null {
  const dist = new Map<NodeId, number>([[from, 0]]);
  const previous = new Map<NodeId, NodeId>();
  const done = new Set<NodeId>();
  while (true) {
    let at: NodeId | null = null;
    for (const [id, d] of dist) if (!done.has(id) && (at === null || d < dist.get(at)!)) at = id;
    if (at === null) return null;
    if (at === to) break;
    done.add(at);
    for (const r of g.roadsAt(at)) {
      if (avoid(r)) continue;
      const next = other(r, at);
      const d = dist.get(at)! + metres(g, r);
      if (d < (dist.get(next) ?? Infinity)) {
        dist.set(next, d);
        previous.set(next, at);
      }
    }
  }
  const way = [to];
  while (way[0] !== from) way.unshift(previous.get(way[0])!);
  return way;
}

export const isClosedOn = (trip: Trip, road: Road) => !!trip.closed?.some((c) => c.road === road.id);

/**
 * The route the score is measured against: shortest, never over a closed
 * road, off busy roads (unless `allowBusy`), through every stop in order.
 */
export function bestRoute(g: Graph, trip: Trip, opts: { allowBusy?: boolean } = {}): NodeId[] | null {
  const door = (id: string) => {
    const l = g.level.landmarks.find((m) => m.id === id);
    if (!l) throw new Error(`Path Finder: no landmark ${id}`);
    return l.door;
  };
  const stops = [trip.from, ...(trip.via ?? []), trip.to].map(door);
  const avoid = (r: Road) => isClosedOn(trip, r) || (!opts.allowBusy && !!r.busy);
  const way: NodeId[] = [stops[0]];
  for (let i = 1; i < stops.length; i++) {
    const leg = shortest(g, stops[i - 1], stops[i], avoid);
    if (!leg) return null;
    way.push(...leg.slice(1));
  }
  return way;
}
