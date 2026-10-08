import { bestRoute, buildGraph } from './graph';
import type { CityLevel, Landmark, Trip } from './types';

/** The trip for a GameShell turn (1-based); a session longer than the level wraps. */
export const tripFor = (level: CityLevel, roundNo: number): Trip =>
  level.trips[(Math.max(roundNo, 1) - 1) % level.trips.length];

export function landmark(level: CityLevel, id: string): Landmark {
  const l = level.landmarks.find((m) => m.id === id);
  if (!l) throw new Error(`Path Finder: no landmark ${id}`);
  return l;
}

/** Everything a hand-written level can get wrong. [] means playable. */
export function validateLevel(level: CityLevel): string[] {
  const problems: string[] = [];
  const dupes = (ids: string[], what: string) => {
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) problems.push(`${what} ${id} appears twice`);
      seen.add(id);
    }
  };
  dupes(level.nodes.map((n) => n.id), 'crossroad');
  dupes(level.roads.map((r) => r.id), 'road');
  dupes(level.landmarks.map((l) => l.id), 'landmark');
  dupes(level.lots.map((l) => l.id), 'lot');

  const nodes = new Set(level.nodes.map((n) => n.id));
  const roads = new Set(level.roads.map((r) => r.id));
  const lots = new Set(level.lots.map((l) => l.id));
  const marks = new Set(level.landmarks.map((l) => l.id));

  for (const r of level.roads)
    for (const end of [r.a, r.b]) if (!nodes.has(end)) problems.push(`road ${r.id} ends at unknown ${end}`);
  for (const l of level.landmarks) {
    if (!nodes.has(l.door)) problems.push(`landmark ${l.id} has unknown door ${l.door}`);
    if (!lots.has(l.lot)) problems.push(`landmark ${l.id} has unknown lot ${l.lot}`);
  }
  const w = level.weights;
  if (w.distance + w.safety + w.planning + w.time !== 100) problems.push('weights do not sum to 100');
  if (problems.length) return problems;

  const g = buildGraph(level);
  level.trips.forEach((t, i) => {
    for (const id of [t.from, t.to, ...(t.via ?? [])])
      if (!marks.has(id)) problems.push(`trip ${i + 1} names unknown landmark ${id}`);
    for (const c of t.closed ?? []) if (!roads.has(c.road)) problems.push(`trip ${i + 1} closes unknown road ${c.road}`);
    if (!problems.length && !bestRoute(g, t)) problems.push(`trip ${i + 1} has no safe route`);
  });
  return problems;
}
