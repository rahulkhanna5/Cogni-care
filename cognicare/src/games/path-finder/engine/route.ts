import { isClosedOn, type Graph } from './graph';
import type { Closure, NodeId, Road, Trip } from './types';

/**
 * Building a route one step at a time. A route is the crossroads walked, in
 * order, starting at the trip's start door. Every refusal carries a reason,
 * so the screen can say exactly why — never a silent no.
 */

export type StepError = 'closed' | 'not-next' | 'same';
export type Target = { kind: 'node'; id: NodeId } | { kind: 'road'; id: string };
export type StepResult = { ok: true; route: NodeId[] } | { ok: false; error: StepError; road?: Road };

export const isClosed = (trip: Trip, road: Road): Closure | undefined =>
  trip.closed?.find((c) => c.road === road.id);

export function step(g: Graph, trip: Trip, route: NodeId[], target: Target): StepResult {
  const end = route[route.length - 1];
  let road: Road | undefined;
  if (target.kind === 'road') {
    road = g.road(target.id);
    // A closed road explains itself wherever you are.
    if (isClosedOn(trip, road)) return { ok: false, error: 'closed', road };
    if (road.a !== end && road.b !== end) return { ok: false, error: 'not-next' };
  } else {
    if (target.id === end) return { ok: false, error: 'same' };
    road = g.roadBetween(end, target.id);
    if (!road) return { ok: false, error: 'not-next' };
    if (isClosedOn(trip, road)) return { ok: false, error: 'closed', road };
  }
  return { ok: true, route: [...route, road.a === end ? road.b : road.a] };
}

/** The roads you can take next — the ones that glow. */
export const nextRoads = (g: Graph, trip: Trip, route: NodeId[]): Road[] =>
  g.roadsAt(route[route.length - 1]).filter((r) => !isClosedOn(trip, r));
