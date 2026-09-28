import { fireEvent, render } from '@testing-library/react-native';

import type { RoundResult } from '@/games/shell/types';
import { pathLevel } from './levels';
import { PathFinder } from './PathFinder';
import { blockOnReturn, edgeKey, generateTown, neighbours, shortestWay, type Node } from './town';

/** Seeded, so the test can rebuild exactly the town the game drew. */
function seeded(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const crossroad = (p: Node) => new RegExp(`^Crossroad ${p.r + 1}, ${p.c + 1}`);

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

it('plays a turn: to the hospital, then home round the accident on a road just used', async () => {
  const LEVEL = 5;
  const onRoundComplete = jest.fn<void, [RoundResult]>();
  const view = await render(
    <PathFinder level={LEVEL} roundNo={1} totalRounds={3} onRoundComplete={onRoundComplete} random={seeded(11)} />
  );

  // The same generator, in the same order, rebuilds the game's town.
  const twin = seeded(11);
  const town = generateTown(pathLevel(LEVEL), 'hospital', twin);
  expect(view.getByText('Go to the hospital')).toBeTruthy();

  const there = shortestWay(town.n, town.blocks, town.home.door, town.destination.door)!;
  for (const p of there.slice(1)) await fireEvent.press(view.getByLabelText(crossroad(p)));
  expect(view.getByText('The shortest way — well done.')).toBeTruthy();

  await jest.advanceTimersByTimeAsync(1800);
  expect(await view.findByText('Now go back home')).toBeTruthy();

  const back = blockOnReturn(town, there, twin);
  const added = Object.keys(back.blocks).filter((k) => !town.blocks[k]);
  expect(added).toHaveLength(1); // a road just used is now closed
  const used = there.slice(1).map((p, i) => edgeKey(there[i], p));
  expect(used).toContain(added[0]);
  expect(view.getByText('An accident has blocked a road you used. Find another way home.')).toBeTruthy();

  const home = shortestWay(back.n, back.blocks, back.destination.door, back.home.door)!;
  for (const p of home.slice(1)) await fireEvent.press(view.getByLabelText(crossroad(p)));
  await jest.advanceTimersByTimeAsync(1800);

  expect(onRoundComplete).toHaveBeenCalledWith(
    expect.objectContaining({ hits: 2, misses: 0, falseAlarms: 0, accuracy: 1 })
  );
});

it('will not walk down a blocked road, and says why', async () => {
  // Find a town where the first step from home has a blocked road beside it.
  for (let seed = 1; seed < 200; seed++) {
    const twin = seeded(seed);
    const town = generateTown(pathLevel(9), 'school', twin);
    const start = town.home.door;
    const shut = neighbours(town.n, start).find((p) => town.blocks[edgeKey(start, p)]);
    if (!shut) continue;

    const view = await render(
      <PathFinder level={9} roundNo={2} totalRounds={3} onRoundComplete={jest.fn()} random={seeded(seed)} />
    );
    await fireEvent.press(view.getByLabelText(crossroad(shut)));
    expect(view.getByText('That road is blocked — find a way round.')).toBeTruthy();
    expect(view.getByText('Trip 1 of 2 · 0 roads so far')).toBeTruthy();
    return;
  }
  throw new Error('no town with a block beside home in 200 seeds');
});
