import { LEVEL_1 } from '../data/level1';
import { buildGraph } from './graph';
import { nextRoads, step } from './route';

const g = buildGraph(LEVEL_1);
const [toClinic] = LEVEL_1.trips; // starts at d2; the bridge c2-d2 is closed

it('walks to a crossroad along an open road', () => {
  expect(step(g, toClinic, ['d2'], { kind: 'node', id: 'd3' })).toEqual({ ok: true, route: ['d2', 'd3'] });
});

it('walks along a tapped road that starts where you are', () => {
  expect(step(g, toClinic, ['d2'], { kind: 'road', id: 'd1-d2' })).toEqual({ ok: true, route: ['d2', 'd1'] });
});

it('will not jump: a crossroad with no road from here is not next', () => {
  expect(step(g, toClinic, ['d2'], { kind: 'node', id: 'd0' })).toEqual({ ok: false, error: 'not-next' });
  expect(step(g, toClinic, ['d2'], { kind: 'road', id: 'a0-a1' })).toEqual({ ok: false, error: 'not-next' });
});

it('tapping where you already are does nothing', () => {
  expect(step(g, toClinic, ['d2', 'd3'], { kind: 'node', id: 'd3' })).toEqual({ ok: false, error: 'same' });
});

it('a closed road is closed whether you tap its far end or the road itself', () => {
  const closed = g.road('c2-d2');
  expect(step(g, toClinic, ['d2'], { kind: 'node', id: 'c2' })).toEqual({ ok: false, error: 'closed', road: closed });
  // Even from the far side of town, tapping the roadworks says why.
  expect(step(g, toClinic, ['d2', 'd3'], { kind: 'road', id: 'c2-d2' })).toEqual({
    ok: false,
    error: 'closed',
    road: closed,
  });
});

it('may come back through a crossroad already walked — a stop can be a dead end', () => {
  expect(step(g, toClinic, ['d2', 'd3'], { kind: 'node', id: 'd2' })).toEqual({ ok: true, route: ['d2', 'd3', 'd2'] });
});

it('offers only the open roads from the end of the route', () => {
  expect(nextRoads(g, toClinic, ['d2']).map((r) => r.id).sort()).toEqual(['d1-d2', 'd2-d3', 'd2-e2']);
});
