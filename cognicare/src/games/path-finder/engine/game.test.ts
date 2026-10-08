import { LEVEL_1 } from '../data/level1';
import { initialState, reducer, type Action, type GameState } from './game';
import { buildGraph } from './graph';

const g = buildGraph(LEVEL_1);
const [toClinic] = LEVEL_1.trips;
const play = (actions: Action[], from: GameState = initialState(g, toClinic)) =>
  actions.reduce(reducer(g, toClinic), from);
const tap = (id: string): Action => ({ type: 'tap', target: { kind: 'node', id } });

it('starts at the trip’s start door, planning', () => {
  expect(initialState(g, toClinic)).toMatchObject({ phase: 'planning', route: ['d2'], corrections: 0, closedTaps: 0 });
});

it('a tap extends the route; a closed road explains itself and is counted', () => {
  expect(play([tap('d3')]).route).toEqual(['d2', 'd3']);
  const s = play([tap('c2')]);
  expect(s.route).toEqual(['d2']);
  expect(s.closedTaps).toBe(1);
  expect(s.note).toEqual({ tone: 'warning', text: 'Roadworks — this road is closed. Find a way round.' });
});

it('a tap that is not one road away says how to walk', () => {
  expect(play([tap('a0')]).note).toEqual({
    tone: 'info',
    text: 'Walk one road at a time — the glowing roads lead from where you are.',
  });
});

it('back and start over are corrections; at the start they do nothing', () => {
  expect(play([{ type: 'back' }])).toMatchObject({ route: ['d2'], corrections: 0 });
  expect(play([tap('d3'), tap('c3'), { type: 'back' }])).toMatchObject({ route: ['d2', 'd3'], corrections: 1 });
  expect(play([tap('d3'), tap('c3'), { type: 'reset' }])).toMatchObject({ route: ['d2'], corrections: 1 });
  expect(play([{ type: 'reset' }]).corrections).toBe(0);
});

it('checking is ignored until the route reaches the destination', () => {
  expect(play([tap('d3'), { type: 'check', elapsedMs: 1000 }]).phase).toBe('planning');
});

it('checking at the destination scores the route, and then the map is still', () => {
  const s = play(['d3', 'c3', 'c2', 'b2'].map(tap).concat({ type: 'check', elapsedMs: 30_000 }));
  expect(s.phase).toBe('result');
  expect(s.breakdown?.total).toBe(100);
  expect(s.evaluation?.metres).toBe(400);
  expect(play([tap('c2'), { type: 'back' }], s)).toBe(s);
});
