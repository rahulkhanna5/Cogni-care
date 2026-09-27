import { fireEvent, render } from '@testing-library/react-native';

import type { RoundResult } from '@/games/shell/types';
import { SpeedyCurrent } from './SpeedyCurrent';

/** Seeded, so the same turn plays every run. */
function seeded(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

it('plays a whole turn on the river: fish count, debris is a false alarm, the turn ends', async () => {
  const onRoundComplete = jest.fn<void, [RoundResult]>();
  const view = await render(
    <SpeedyCurrent level={1} roundNo={1} totalRounds={4} onRoundComplete={onRoundComplete} random={seeded(3)} />
  );
  await fireEvent(view.getByTestId('falling-board'), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: 343, height: 560 } },
  });

  let fish = 0;
  let debris = 0;
  // Play it out: tap the first fish and the first leaf that come along.
  for (let t = 0; t < 30_000 && !onRoundComplete.mock.calls.length; t += 250) {
    await jest.advanceTimersByTimeAsync(250);
    if (!fish && view.queryAllByLabelText('Fish').length) {
      await fireEvent.press(view.getAllByLabelText('Fish')[0]);
      fish++;
    }
    if (!debris && view.queryAllByLabelText('Leaf').length) {
      await fireEvent.press(view.getAllByLabelText('Leaf')[0]);
      debris++;
    }
  }

  expect(fish).toBe(1);
  expect(debris).toBe(1);
  expect(onRoundComplete).toHaveBeenCalledTimes(1);
  const result = onRoundComplete.mock.calls[0][0];
  // Level 1 has six fish: one caught, the rest swam by.
  expect(result).toEqual(expect.objectContaining({ hits: 1, misses: 5, falseAlarms: 1 }));
});
