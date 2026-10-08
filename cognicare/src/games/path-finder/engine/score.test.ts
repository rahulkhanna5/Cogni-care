import { LEVEL_1 } from '../data/level1';
import { buildGraph } from './graph';
import { evaluate } from './rules';
import { score, shortfalls, toRoundResult, verdict } from './score';

const g = buildGraph(LEVEL_1);
const [toClinic, toPharmacy, homeViaPark] = LEVEL_1.trips;
const W = LEVEL_1.weights;

it('the best route, unchanged, scores full marks', () => {
  const ev = evaluate(g, toClinic, ['d2', 'd3', 'c3', 'c2', 'b2']);
  expect(score(ev, W, 0, 40_000)).toEqual({ distance: 40, safety: 30, planning: 20, time: 10, total: 100 });
  expect(verdict(ev)).toBe('great');
  expect(shortfalls(ev, LEVEL_1, 0)).toEqual([]);
});

it('the busy road keeps distance points but loses safety, in proportion', () => {
  const ev = evaluate(g, toPharmacy, ['b2', 'b1', 'b0', 'a0']);
  // 200 of 300 m on the busy road: 30 × (1 − 2/3) = 10.
  expect(score(ev, W, 0, 30_000)).toEqual({ distance: 40, safety: 10, planning: 20, time: 10, total: 80 });
  expect(verdict(ev)).toBe('made-it');
  expect(shortfalls(ev, LEVEL_1, 0)).toEqual(['Your route used the busy road. The quiet streets are safer.']);
});

it('a longer route loses distance points and is told how much shorter the best was', () => {
  // The west bridge: 600 m against 400.
  const ev = evaluate(g, toClinic, ['d2', 'd1', 'd0', 'c0', 'c1', 'c2', 'b2']);
  expect(score(ev, W, 0, 0).distance).toBe(27); // 40 × 400/600
  expect(shortfalls(ev, LEVEL_1, 0)).toEqual(['A shorter safe way was 200 m less — it is the dashed line.']);
});

it('changes to the route cost planning points; a missed stop costs them all', () => {
  const best = evaluate(g, toClinic, ['d2', 'd3', 'c3', 'c2', 'b2']);
  expect(score(best, W, 2, 0).planning).toBe(12);
  expect(score(best, W, 9, 0).planning).toBe(0);
  const missed = evaluate(g, homeViaPark, ['a0', 'b0', 'c0', 'c1', 'c2', 'd2']);
  expect(score(missed, W, 0, 0).planning).toBe(0);
  expect(shortfalls(missed, LEVEL_1, 0)).toContain('You did not stop at the park.');
});

it('time is full marks unless the level sets a limit', () => {
  const ev = evaluate(g, toClinic, ['d2', 'd3', 'c3', 'c2', 'b2']);
  expect(score(ev, W, 0, 10 * 60_000).time).toBe(10);
  expect(score(ev, W, 0, 120_000, 60).time).toBe(5);
});

it('maps onto the shell round: busy roads and closed-road taps are commissions, missed stops omissions', () => {
  const ev = evaluate(g, homeViaPark, ['a0', 'b0', 'c0', 'c1', 'c2', 'd2']);
  const b = score(ev, W, 0, 50_000);
  expect(toRoundResult(ev, b, 1, 50_000)).toEqual({
    hits: 0,
    misses: 1,
    falseAlarms: 1, // one closed-road tap; no busy road walked
    accuracy: b.total / 100,
    avgReactionMs: 50_000,
    score: b.total,
  });
  const great = evaluate(g, toClinic, ['d2', 'd3', 'c3', 'c2', 'b2']);
  expect(toRoundResult(great, score(great, W, 0, 1), 0, 1)).toMatchObject({ hits: 1, misses: 0, falseAlarms: 0, accuracy: 1 });
});
