import { bestRoute, metres, routeMetres, type Graph } from './graph';
import { landmark } from './level';
import type { NodeId, Trip } from './types';

/** Everything the score needs to know about a finished route. */
export type Evaluation = {
  reached: boolean;
  metres: number;
  /** The best safe route through every stop, and its length. */
  bestMetres: number;
  best: NodeId[];
  busyMetres: number;
  /** One entry per busy road walked, in the order walked. */
  busyRoads: string[];
  /** Stops (landmark ids) not visited in the order asked. */
  missedStops: string[];
};

export function evaluate(g: Graph, trip: Trip, route: NodeId[]): Evaluation {
  const best = bestRoute(g, trip) ?? bestRoute(g, trip, { allowBusy: true }) ?? route;

  let busyMetres = 0;
  const busyRoads: string[] = [];
  for (let i = 1; i < route.length; i++) {
    const r = g.roadBetween(route[i - 1], route[i]);
    if (r?.busy) {
      busyMetres += metres(g, r);
      busyRoads.push(r.id);
    }
  }

  // Stops count only in order: each must come after the one before it.
  const missedStops: string[] = [];
  let after = 0;
  for (const stop of trip.via ?? []) {
    const door = landmark(g.level, stop).door;
    const at = route.indexOf(door, after + 1);
    if (at === -1) missedStops.push(stop);
    else after = at;
  }

  return {
    reached: route[route.length - 1] === landmark(g.level, trip.to).door,
    metres: routeMetres(g, route),
    bestMetres: routeMetres(g, best),
    best,
    busyMetres,
    busyRoads,
    missedStops,
  };
}
