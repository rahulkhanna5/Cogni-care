import type { CityLevel, Closure } from '../engine/types';
import { buildTown } from './town';

/**
 * Levels 2 to 6 — each a different town, each harder than the last.
 *
 * What grows, in the order a person meets it:
 *   2  keep off a busy road · one stop · one closed road
 *   3  stops and closures together; a bigger map with its own river
 *   4  three busy streets and a stop; a taller town
 *   5  a long trip that goes home on the way; seven rows of streets
 *   6  two stops AND a closure AND the busy roads, across the whole town
 *
 * Difficulty is not judged by eye: engine/difficulty.ts scores every trip and
 * data/levels.test.ts fails unless each level scores higher than the one
 * before. The trips were found by searching each town for routes where the
 * obvious way is wrong and the right way is still unique enough to plan.
 */

const works = (road: string): Closure => ({ road, kind: 'roadworks' });
const crash = (road: string): Closure => ({ road, kind: 'accident' });

/** Level 2 — Market Street. A busy road to keep off, a stop, one accident. */
export const LEVEL_2: CityLevel = buildTown({
  number: 2,
  title: 'Market Street',
  cols: 5,
  rows: 5,
  riverAfterRow: 2,
  bridges: [0, 4],
  busyRows: [1],
  park: [1, 3],
  places: {
    home: { cell: [3, 3], door: 'd3' },
    clinic: { cell: [0, 0], door: 'b1' },
    pharmacy: { cell: [3, 0], door: 'b3' },
  },
  shops: [[1, 0]],
  trips: [
    {
      from: 'clinic',
      to: 'pharmacy',
      title: 'Collect your medicine',
      instruction: 'Walk from the clinic to the pharmacy. The main street is busy, so find the safe way.',
    },
    {
      from: 'home',
      to: 'clinic',
      via: ['park'],
      title: 'Through the park',
      instruction: 'Walk to the clinic, and stop at the fountain in the park on the way.',
    },
    {
      from: 'home',
      to: 'pharmacy',
      closed: [crash('c3-c4')],
      title: 'An accident on the road',
      instruction: 'There has been an accident. Find the shortest safe way to the pharmacy.',
    },
  ],
});

/** Level 3 — Riverside. Stops and closures together, on a new map. */
export const LEVEL_3: CityLevel = buildTown({
  number: 3,
  title: 'Riverside',
  cols: 5,
  rows: 5,
  riverAfterRow: 1,
  bridges: [1, 3],
  busyRows: [3],
  park: [2, 0],
  places: {
    home: { cell: [0, 3], door: 'e1' },
    clinic: { cell: [3, 2], door: 'c3' },
    pharmacy: { cell: [0, 0], door: 'b0' },
  },
  trees: [[3, 3]],
  trips: [
    {
      from: 'clinic',
      to: 'home',
      via: ['park'],
      closed: [works('b1-b2')],
      title: 'Home through the park',
      instruction: 'Stop at the park fountain on your way home. Roadworks have closed one road.',
    },
    {
      from: 'home',
      to: 'pharmacy',
      closed: [crash('b1-c1')],
      title: 'Fetch your tablets',
      instruction: 'A road is closed after an accident. Find the shortest way to the pharmacy.',
    },
    {
      from: 'pharmacy',
      to: 'home',
      via: ['park', 'clinic'],
      title: 'Two stops on the way home',
      instruction: 'Walk home, stopping at the park fountain first and then at the clinic.',
    },
  ],
});

/** Level 4 — Old Town. A taller map with busy streets. */
export const LEVEL_4: CityLevel = buildTown({
  number: 4,
  title: 'Old Town',
  cols: 5,
  rows: 6,
  riverAfterRow: 2,
  bridges: [1, 3],
  busyRows: [1, 4],
  park: [2, 4],
  places: {
    home: { cell: [0, 4], door: 'e1' },
    clinic: { cell: [3, 0], door: 'b3' },
    pharmacy: { cell: [0, 0], door: 'b1' },
  },
  shops: [
    [1, 0],
    [3, 4],
  ],
  trips: [
    {
      from: 'home',
      to: 'pharmacy',
      via: ['park'],
      closed: [works('d1-d2')],
      title: 'Past the park',
      instruction: 'Stop at the park fountain on the way to the pharmacy. One road is closed.',
    },
    {
      from: 'home',
      to: 'pharmacy',
      via: ['clinic'],
      title: 'Clinic first',
      instruction: 'Visit the clinic, then the pharmacy. Keep off the busy streets.',
    },
    {
      from: 'home',
      to: 'clinic',
      via: ['park'],
      closed: [crash('f1-f2')],
      title: 'Round the closed road',
      instruction: 'Stop at the park fountain on the way to the clinic. A road along the bottom is closed.',
    },
  ],
});

/** Level 5 — The Far Side. Seven rows, and a trip that passes home on the way. */
export const LEVEL_5: CityLevel = buildTown({
  number: 5,
  title: 'The Far Side',
  cols: 5,
  rows: 7,
  riverAfterRow: 2,
  bridges: [1, 3],
  busyRows: [1, 4],
  park: [3, 3],
  places: {
    home: { cell: [0, 5], door: 'f1' },
    clinic: { cell: [3, 0], door: 'b3' },
    pharmacy: { cell: [0, 3], door: 'd1' },
  },
  shops: [
    [1, 0],
    [2, 5],
  ],
  trips: [
    {
      from: 'home',
      to: 'clinic',
      via: ['park'],
      closed: [works('b3-c3')],
      title: 'Across town to the clinic',
      instruction: 'Stop at the park fountain. The road up to the clinic door is closed, so find another way in.',
    },
    {
      from: 'clinic',
      to: 'pharmacy',
      via: ['home'],
      closed: [crash('d1-e1')],
      title: 'Home on the way',
      instruction: 'Walk from the clinic past your home, then to the pharmacy. One road is closed.',
    },
    {
      from: 'clinic',
      to: 'pharmacy',
      via: ['park', 'home'],
      title: 'Park, home, pharmacy',
      instruction: 'Stop at the park fountain, then at home, then at the pharmacy.',
    },
  ],
});

/** Level 6 — Rush Hour. Stops, closures and busy streets, all at once. */
export const LEVEL_6: CityLevel = buildTown({
  number: 6,
  title: 'Rush Hour',
  cols: 5,
  rows: 6,
  riverAfterRow: 3,
  bridges: [0, 4],
  busyRows: [2, 4],
  park: [1, 1],
  places: {
    home: { cell: [3, 4], door: 'e3' },
    clinic: { cell: [0, 0], door: 'b0' },
    pharmacy: { cell: [3, 0], door: 'b3' },
  },
  shops: [
    [2, 1],
    [1, 4],
  ],
  trips: [
    {
      from: 'clinic',
      to: 'home',
      via: ['park', 'pharmacy'],
      title: 'The long way home',
      instruction: 'Stop at the park fountain, then at the pharmacy, then go home. Keep off the busy streets.',
    },
    {
      from: 'home',
      to: 'pharmacy',
      closed: [works('f3-f4')],
      title: 'Out to the pharmacy',
      instruction: 'A road by your home is closed. Find the shortest safe way to the pharmacy.',
    },
    {
      from: 'home',
      to: 'clinic',
      via: ['park'],
      closed: [crash('b0-b1')],
      title: 'Across the whole town',
      instruction: 'Stop at the park fountain. The road to the clinic door is closed, so find another way in.',
    },
  ],
});
