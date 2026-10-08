import { bestRoute, buildGraph, routeMetres, shortest } from './graph';
import type { CityLevel } from './types';

/**
 *   a ──100── b
 *    \       /
 *    300   100
 *      \   /
 *        c ──100── d
 */
const TRIANGLE: CityLevel = {
  number: 0,
  title: 'test',
  bounds: { x0: 0, y0: 0, x1: 3, y1: 2 },
  nodes: [
    { id: 'a', x: 0, y: 0 },
    { id: 'b', x: 1, y: 0 },
    { id: 'c', x: 1, y: 1 },
    { id: 'd', x: 2, y: 1 },
  ],
  roads: [
    { id: 'ab', a: 'a', b: 'b' },
    { id: 'bc', a: 'b', b: 'c' },
    { id: 'ac', a: 'a', b: 'c', gameDistance: 300 },
    { id: 'cd', a: 'c', b: 'd', busy: true },
  ],
  landmarks: [
    { id: 'home', kind: 'home', label: 'Home', door: 'a', lot: 'x' },
    { id: 'park', kind: 'park', label: 'Park', door: 'c', lot: 'x' },
    { id: 'shop', kind: 'pharmacy', label: 'Pharmacy', door: 'd', lot: 'x' },
  ],
  lots: [{ id: 'x', rect: { x0: 0, y0: 0, x1: 1, y1: 1 }, use: 'houses' }],
  water: [],
  trips: [],
  weights: { distance: 40, safety: 30, planning: 20, time: 10 },
};

const g = buildGraph(TRIANGLE);

it('takes the cheaper way, by game distance rather than by eye', () => {
  expect(shortest(g, 'a', 'c', () => false)).toEqual(['a', 'b', 'c']);
  expect(routeMetres(g, ['a', 'b', 'c'])).toBe(200);
  expect(routeMetres(g, ['a', 'c'])).toBe(300);
});

it('goes round a road it is told to avoid, and says null when nothing is left', () => {
  expect(shortest(g, 'a', 'c', (r) => r.id === 'bc')).toEqual(['a', 'c']);
  expect(shortest(g, 'a', 'd', (r) => r.id === 'cd')).toBeNull();
});

it('joins the legs of a trip through its stops without repeating the stop', () => {
  const trip = { from: 'home', to: 'shop', via: ['park'], title: '', instruction: '' };
  // The only way to the pharmacy is the busy road: no safe route, unless allowed.
  expect(bestRoute(g, trip)).toBeNull();
  expect(bestRoute(g, trip, { allowBusy: true })).toEqual(['a', 'b', 'c', 'd']);
});

it('never routes over a closed road', () => {
  const trip = {
    from: 'home',
    to: 'park',
    closed: [{ road: 'bc', kind: 'roadworks' as const }],
    title: '',
    instruction: '',
  };
  expect(bestRoute(g, trip)).toEqual(['a', 'c']);
});
