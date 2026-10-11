import { bestRoute, buildGraph, metres, routeMetres, shortest, type Graph } from './graph';
import { landmark } from './level';
import type { CityLevel, NodeId, Road, Trip } from './types';

/**
 * How hard a trip is, from what is actually in it — so the ladder of levels
 * can be checked rather than trusted.
 *
 *   length      the best safe route, per 100 m
 *   stops       each stop to make on the way
 *   detour      how much longer the right way is than the way you would draw
 *               first (ignoring closed and busy roads), per 100 m, counted
 *               double: it is the real "plan, do not just walk" cost
 *   closures    roads shut on this trip
 *   busy        the obvious way runs along a busy road
 *
 * A level's difficulty is the mean over its trips.
 */
export type TripFacts = {
  bestMetres: number;
  naiveMetres: number;
  stops: number;
  closures: number;
  busyOnObviousWay: boolean;
};

/** The way you would draw without looking: shortest, closures and traffic ignored. Ties go to the busy road. */
function obviousRoute(g: Graph, trip: Trip): NodeId[] {
  const door = (id: string) => landmark(g.level, id).door;
  const stops = [trip.from, ...(trip.via ?? []), trip.to].map(door);
  // A hair off busy roads makes them win ties, as the eye would.
  const lean = buildGraph({
    ...g.level,
    roads: g.level.roads.map((r) => ({ ...r, gameDistance: metres(g, r) - (r.busy ? 0.5 : 0) })),
  });
  const way: NodeId[] = [stops[0]!];
  for (let i = 1; i < stops.length; i++) {
    const leg = shortest(lean, stops[i - 1]!, stops[i]!, () => false);
    if (leg) way.push(...leg.slice(1));
  }
  return way;
}

export function tripFacts(g: Graph, trip: Trip): TripFacts {
  const best = bestRoute(g, trip);
  if (!best) throw new Error('Path Finder: a trip has no safe route');
  const naive = obviousRoute(g, trip);
  const busy = (a: NodeId, b: NodeId): Road | undefined => g.roadBetween(a, b);
  return {
    bestMetres: routeMetres(g, best),
    naiveMetres: routeMetres(g, naive),
    stops: trip.via?.length ?? 0,
    closures: trip.closed?.length ?? 0,
    busyOnObviousWay: naive.some((n, i) => i > 0 && !!busy(naive[i - 1]!, n)?.busy),
  };
}

export function tripDifficulty(g: Graph, trip: Trip): number {
  const f = tripFacts(g, trip);
  const detour = Math.max(0, f.bestMetres - f.naiveMetres);
  return f.bestMetres / 100 + 3 * f.stops + (2 * detour) / 100 + f.closures + (f.busyOnObviousWay ? 2 : 0);
}

export function levelDifficulty(level: CityLevel): number {
  const g = buildGraph(level);
  const total = level.trips.reduce((sum, t) => sum + tripDifficulty(g, t), 0);
  return total / level.trips.length;
}
