import type { CityLevel, Lot, Road } from '../engine/types';

/**
 * Level 1 — "Find the Clinic".
 *
 *        0      1      2      3
 *   a    ●──────●──────●──────●
 *        │ PHARM│ homes│CLINIC│
 *   b    ●══════●══════●══════●      Main Street — busy
 *        │ shops│ PARK │ homes│      park paths cross at the fountain (p)
 *   c    ●──────●──────●──────●
 *        ~~~~~~~│~~~~~~~~~~~~~│~~   the river: bridges at 0, 2 and 3
 *   d    ●──────●──────●──────●
 *        │ homes│ HOME │ trees│
 *   e    ●──────●──────●──────●
 *
 * Three trips, each adding one idea (measured in data/level1.test.ts):
 *  1. Home → clinic. Roadworks shut the bridge straight ahead: 200 m becomes
 *     400 m by the east bridge, 600 m by the west.
 *  2. Clinic → pharmacy, off the busy road. The quiet way is exactly as short
 *     as the busy one, so keeping off it costs nothing but attention.
 *  3. Pharmacy → home past the park fountain. The diagonal path is the
 *     shortcut: 442 m, against 500 m by streets (which misses the fountain).
 */

const ROWS = 'abcde';
const nodes = [
  ...Array.from({ length: 5 * 4 }, (_, i) => ({ id: `${ROWS[Math.floor(i / 4)]}${i % 4}`, x: i % 4, y: Math.floor(i / 4) })),
  { id: 'p', x: 1.5, y: 1.5 },
];

const roads: Road[] = [];
const road = (a: string, b: string, extra: Partial<Road> = {}) => roads.push({ id: `${a}-${b}`, a, b, ...extra });
for (let y = 0; y < 5; y++)
  for (let x = 0; x < 3; x++)
    road(`${ROWS[y]}${x}`, `${ROWS[y]}${x + 1}`, y === 1 ? { busy: true, name: 'Main Street' } : {});
// North–south. Between c and d is the river: only the bridges cross it.
for (const [from, to, cols] of [
  ['a', 'b', [0, 1, 2, 3]],
  ['b', 'c', [0, 1, 2, 3]],
  ['c', 'd', [0, 2, 3]],
  ['d', 'e', [0, 1, 2, 3]],
] as const)
  for (const x of cols) road(`${from}${x}`, `${to}${x}`);
for (const corner of ['b1', 'b2', 'c1', 'c2']) road(corner, 'p', { footpath: true });

const lot = (id: string, cx: number, cy: number, use: Lot['use'], landmark?: string): Lot => ({
  id,
  rect: { x0: cx, y0: cy, x1: cx + 1, y1: cy + 1 },
  use,
  landmark,
});

export const LEVEL_1: CityLevel = {
  number: 1,
  title: 'Find the Clinic',
  // Wider top and bottom margins: the edge places' names sit there.
  bounds: { x0: -0.45, y0: -0.6, x1: 3.45, y1: 4.6 },
  nodes,
  roads,
  landmarks: [
    { id: 'home', kind: 'home', label: 'Home', door: 'd2', lot: 'home' },
    { id: 'clinic', kind: 'clinic', label: 'Clinic', door: 'b2', lot: 'clinic' },
    { id: 'pharmacy', kind: 'pharmacy', label: 'Pharmacy', door: 'a0', lot: 'pharmacy' },
    { id: 'park', kind: 'park', label: 'Park', door: 'p', lot: 'park' },
  ],
  lots: [
    lot('pharmacy', 0, 0, 'landmark', 'pharmacy'),
    lot('north-homes', 1, 0, 'houses'),
    lot('clinic', 2, 0, 'landmark', 'clinic'),
    lot('shops', 0, 1, 'shops'),
    lot('park', 1, 1, 'park', 'park'),
    lot('east-homes', 2, 1, 'houses'),
    lot('west-homes', 0, 3, 'houses'),
    lot('home', 1, 3, 'landmark', 'home'),
    lot('copse', 2, 3, 'trees'),
  ],
  water: [{ x0: -1, y0: 2.24, x1: 5, y1: 2.76 }],
  trips: [
    {
      from: 'home',
      to: 'clinic',
      closed: [{ road: 'c2-d2', kind: 'roadworks' }],
      title: 'Walk to the clinic',
      instruction: 'Find the shortest safe way to the clinic. One bridge is closed for roadworks.',
    },
    {
      from: 'clinic',
      to: 'pharmacy',
      title: 'Pick up your medicine',
      instruction: 'Now walk to the pharmacy. Keep off the busy road.',
    },
    {
      from: 'pharmacy',
      to: 'home',
      via: ['park'],
      title: 'Home through the park',
      instruction: 'Walk home, and stop at the fountain in the park on the way.',
    },
  ],
  weights: { distance: 40, safety: 30, planning: 20, time: 10 },
};
