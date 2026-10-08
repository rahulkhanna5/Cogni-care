import type { Graph } from './graph';
import type { Target } from './route';

/**
 * A forgiving tap: the nearest crossroad within reach, else the nearest road.
 * A shaky finger landing beside a thin line still means that line.
 */

export type Point = { x: number; y: number };

export function nearestTarget(
  g: Graph,
  toScreen: (p: Point) => Point,
  at: Point,
  { nodeRadius = 40, roadRadius = 32 }: { nodeRadius?: number; roadRadius?: number } = {}
): Target | null {
  let node: { id: string; d: number } | null = null;
  for (const n of g.level.nodes) {
    const p = toScreen(n);
    const d = Math.hypot(p.x - at.x, p.y - at.y);
    if (d <= nodeRadius && (!node || d < node.d)) node = { id: n.id, d };
  }
  if (node) return { kind: 'node', id: node.id };

  let road: { id: string; d: number } | null = null;
  for (const r of g.level.roads) {
    const d = toSegment(at, toScreen(g.node(r.a)), toScreen(g.node(r.b)));
    if (d <= roadRadius && (!road || d < road.d)) road = { id: r.id, d };
  }
  return road ? { kind: 'road', id: road.id } : null;
}

function toSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}
