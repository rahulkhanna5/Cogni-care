import { LEVEL_1 } from '../data/level1';
import { buildGraph } from './graph';
import { nearestTarget } from './hit';

const g = buildGraph(LEVEL_1);
/** 100 screen units per world unit: d2 (2,3) is drawn at (200, 300). */
const toScreen = (p: { x: number; y: number }) => ({ x: p.x * 100, y: p.y * 100 });

it('a tap near a crossroad picks the crossroad — no need to hit it exactly', () => {
  expect(nearestTarget(g, toScreen, { x: 230, y: 300 })).toEqual({ kind: 'node', id: 'd2' });
});

it('a tap on the middle of a road, away from any crossroad, picks the road', () => {
  expect(nearestTarget(g, toScreen, { x: 250, y: 310 })).toEqual({ kind: 'road', id: 'd2-d3' });
});

it('a tap on open grass picks nothing', () => {
  expect(nearestTarget(g, toScreen, { x: 250, y: 350 })).toBeNull();
});

it('between two crossroads in range, the nearer wins', () => {
  // The fountain p (150,150) and b1 (100,100) are 71 apart.
  expect(nearestTarget(g, toScreen, { x: 135, y: 135 })).toEqual({ kind: 'node', id: 'p' });
  expect(nearestTarget(g, toScreen, { x: 115, y: 115 })).toEqual({ kind: 'node', id: 'b1' });
});
