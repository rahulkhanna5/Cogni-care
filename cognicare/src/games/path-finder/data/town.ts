import type { CityLevel, Landmark, Lot, Road, Trip } from '../engine/types';

/**
 * Builds a town from a short description, so a new level is a handful of
 * lines — where the river runs, which roads are busy, where the places are —
 * and a list of trips. Level 1 predates this and is written out by hand.
 *
 * Crossroads are named by row letter and column number: a0 is top-left, and
 * the road between a0 and a1 is "a0-a1" (the first one named is the north or
 * west end). The river runs along the gap between two rows of crossroads;
 * only the columns listed in `bridges` have a road across it.
 */

const ROWS = 'abcdefghij';
export const nodeId = (row: number, col: number) => `${ROWS[row]}${col}`;

type Cell = [col: number, row: number];
type Place = { cell: Cell; door: string };

export type TownSpec = {
  number: number;
  title: string;
  /** crossroads across and down — five across is the most a phone can tap */
  cols: number;
  rows: number;
  /** the river runs between this row of crossroads and the next */
  riverAfterRow: number;
  bridges: number[];
  /** rows whose east–west roads carry heavy traffic */
  busyRows: number[];
  /** the park's lot; its four corners meet at a fountain */
  park: Cell;
  places: { home: Place; clinic: Place; pharmacy: Place };
  shops?: Cell[];
  trees?: Cell[];
  trips: Trip[];
};

const same = (a: Cell, b: Cell) => a[0] === b[0] && a[1] === b[1];

export function buildTown(spec: TownSpec): CityLevel {
  const { cols, rows } = spec;

  const nodes = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) nodes.push({ id: nodeId(r, c), x: c, y: r });
  nodes.push({ id: 'p', x: spec.park[0] + 0.5, y: spec.park[1] + 0.5 });

  const roads: Road[] = [];
  const road = (a: string, b: string, extra: Partial<Road> = {}) => roads.push({ id: `${a}-${b}`, a, b, ...extra });

  for (let r = 0; r < rows; r++)
    for (let c = 0; c + 1 < cols; c++)
      road(nodeId(r, c), nodeId(r, c + 1), spec.busyRows.includes(r) ? { busy: true, name: 'Main Street' } : {});

  for (let r = 0; r + 1 < rows; r++)
    for (let c = 0; c < cols; c++) {
      // Only the bridges cross the river.
      if (r === spec.riverAfterRow && !spec.bridges.includes(c)) continue;
      road(nodeId(r, c), nodeId(r + 1, c));
    }

  const [pc, pr] = spec.park;
  for (const [dc, dr] of [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
  ])
    road(nodeId(pr + dr, pc + dc), 'p', { footpath: true });

  const landmarks: Landmark[] = [
    { id: 'home', kind: 'home', label: 'Home', door: spec.places.home.door, lot: 'home' },
    { id: 'clinic', kind: 'clinic', label: 'Clinic', door: spec.places.clinic.door, lot: 'clinic' },
    { id: 'pharmacy', kind: 'pharmacy', label: 'Pharmacy', door: spec.places.pharmacy.door, lot: 'pharmacy' },
    { id: 'park', kind: 'park', label: 'Park', door: 'p', lot: 'park' },
  ];

  const lots: Lot[] = [];
  for (let cy = 0; cy + 1 < rows; cy++) {
    // The row of lots the river runs through is water, not land.
    if (cy === spec.riverAfterRow) continue;
    for (let cx = 0; cx + 1 < cols; cx++) {
      const cell: Cell = [cx, cy];
      const rect = { x0: cx, y0: cy, x1: cx + 1, y1: cy + 1 };
      const place = (['home', 'clinic', 'pharmacy'] as const).find((k) => same(spec.places[k].cell, cell));
      if (place) lots.push({ id: place, rect, use: 'landmark', landmark: place });
      else if (same(spec.park, cell)) lots.push({ id: 'park', rect, use: 'park', landmark: 'park' });
      else if (spec.shops?.some((s) => same(s, cell))) lots.push({ id: `shops-${cx}-${cy}`, rect, use: 'shops' });
      else if (spec.trees?.some((s) => same(s, cell))) lots.push({ id: `trees-${cx}-${cy}`, rect, use: 'trees' });
      else lots.push({ id: `homes-${cx}-${cy}`, rect, use: 'houses' });
    }
  }

  const waterY = spec.riverAfterRow;
  return {
    number: spec.number,
    title: spec.title,
    bounds: { x0: -0.45, y0: -0.6, x1: cols - 1 + 0.45, y1: rows - 1 + 0.6 },
    nodes,
    roads,
    landmarks,
    lots,
    water: [{ x0: -1, y0: waterY + 0.24, x1: cols + 1, y1: waterY + 0.76 }],
    trips: spec.trips,
    weights: { distance: 40, safety: 30, planning: 20, time: 10 },
  };
}
