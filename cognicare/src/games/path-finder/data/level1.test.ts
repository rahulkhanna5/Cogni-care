import { bestRoute, buildGraph, routeMetres, shortest } from '../engine/graph';
import { validateLevel } from '../engine/level';
import { LEVEL_1 } from './level1';

const g = buildGraph(LEVEL_1);
const [toClinic, toPharmacy, homeViaPark] = LEVEL_1.trips;
const metresOf = (route: string[] | null) => (route ? routeMetres(g, route) : NaN);

it('is a valid level', () => {
  expect(validateLevel(LEVEL_1)).toEqual([]);
  expect(LEVEL_1.trips).toHaveLength(3);
});

it('trip 1: the roadworks on the bridge really do make the walk longer', () => {
  expect(metresOf(bestRoute(g, toClinic))).toBe(400);
  expect(metresOf(bestRoute(g, { ...toClinic, closed: [] }))).toBe(200);
});

it('trip 2: the busy road is as short as the quiet way — a real temptation', () => {
  const safe = bestRoute(g, toPharmacy)!;
  expect(metresOf(safe)).toBe(300);
  expect(safe.every((n, i) => i === 0 || !g.roadBetween(safe[i - 1], n)!.busy)).toBe(true);
  // Several 300 m routes exist; at least one of them uses the busy road.
  const viaBusy = shortest(g, 'b2', 'a0', (r) => r.id === 'a1-a2');
  expect(metresOf(viaBusy)).toBe(300);
  expect(viaBusy!.some((n, i) => i > 0 && g.roadBetween(viaBusy![i - 1], n)!.busy)).toBe(true);
});

it('trip 3: the path across the park is the shortcut, and it passes the fountain', () => {
  const best = bestRoute(g, homeViaPark)!;
  expect(metresOf(best)).toBe(442);
  expect(best).toContain('p');
  // By streets alone it is longer — and misses the fountain.
  const streets = shortest(g, 'a0', 'd2', (r) => !!r.footpath);
  expect(metresOf(streets)).toBe(500);
  expect(streets).not.toContain('p');
});
