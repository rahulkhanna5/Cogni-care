import { LEVEL_1 } from '../data/level1';
import { buildGraph } from './graph';
import { evaluate } from './rules';

const g = buildGraph(LEVEL_1);
const [toClinic, toPharmacy, homeViaPark] = LEVEL_1.trips;

it('the best route is measured against itself: nothing missing, nothing unsafe', () => {
  expect(evaluate(g, toClinic, ['d2', 'd3', 'c3', 'c2', 'b2'])).toEqual({
    reached: true,
    metres: 400,
    bestMetres: 400,
    best: ['d2', 'd3', 'c3', 'c2', 'b2'],
    busyMetres: 0,
    busyRoads: [],
    missedStops: [],
  });
});

it('reports every busy road walked, and how far', () => {
  const ev = evaluate(g, toPharmacy, ['b2', 'b1', 'b0', 'a0']);
  expect(ev).toMatchObject({ reached: true, metres: 300, bestMetres: 300, busyMetres: 200 });
  expect(ev.busyRoads).toEqual(['b1-b2', 'b0-b1']);
});

it('a route that skips the fountain has missed the stop', () => {
  const ev = evaluate(g, homeViaPark, ['a0', 'b0', 'c0', 'c1', 'c2', 'd2']);
  expect(ev.missedStops).toEqual(['park']);
  expect(ev.bestMetres).toBe(442);
});

it('a route that stops short has not reached the destination', () => {
  expect(evaluate(g, toClinic, ['d2', 'd3']).reached).toBe(false);
});
