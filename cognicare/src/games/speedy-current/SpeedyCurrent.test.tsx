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

it('plays a whole turn: a fish from either end is a catch; a leaf is a false alarm', async () => {
  const onRoundComplete = jest.fn<void, [RoundResult]>();
  const view = await render(
    <SpeedyCurrent level={1} roundNo={1} totalRounds={4} onRoundComplete={onRoundComplete} random={seeded(3)} />
  );
  await fireEvent(view.getByTestId('falling-board'), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: 343, height: 560 } },
  });

  // The spoken labels carry the direction; the drawings carry no words.
  const tapped = { up: 0, down: 0, leaf: 0 };
  const once = async (label: string, key: keyof typeof tapped) => {
    if (tapped[key] || !view.queryAllByLabelText(label).length) return;
    await fireEvent.press(view.getAllByLabelText(label)[0]);
    tapped[key]++;
  };
  for (let t = 0; t < 30_000 && !onRoundComplete.mock.calls.length; t += 250) {
    await jest.advanceTimersByTimeAsync(250);
    await once('Fish, swimming up', 'up');
    await once('Fish, swimming down', 'down');
    await once('Leaf, drifting down', 'leaf');
  }

  expect(tapped).toEqual({ up: 1, down: 1, leaf: 1 });
  expect(onRoundComplete).toHaveBeenCalledTimes(1);
  // Level 1 has six fish: the one swimming up and the one swimming down are
  // both caught, the other four swam by. The leaf is an error of commission,
  // kept apart from the misses.
  expect(onRoundComplete.mock.calls[0][0]).toEqual(expect.objectContaining({ hits: 2, misses: 4, falseAlarms: 1 }));
});

it('draws only the objects — no word appears on the river', async () => {
  const view = await render(
    <SpeedyCurrent level={1} roundNo={1} totalRounds={4} onRoundComplete={jest.fn()} random={seeded(3)} />
  );
  await fireEvent(view.getByTestId('falling-board'), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: 343, height: 560 } },
  });
  await jest.advanceTimersByTimeAsync(3000);
  expect(view.queryAllByLabelText(/swimming|drifting/).length).toBeGreaterThan(0);
  for (const word of ['Fish', 'Leaf', 'Drop', 'Weed', 'Shell']) expect(view.queryByText(word)).toBeNull();
});
