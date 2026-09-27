import { fireEvent, render } from '@testing-library/react-native';
import { State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';

import type { FallerSpec } from '@/games/shared/falling';
import type { RoundResult } from '@/games/shell/types';
import { BasketBoard } from './BasketBoard';

/**
 * One list item (Bread) and one other (Soap), both entering at the top and
 * taking 10s to cross, so nothing expires mid-test.
 *
 * Board 343×600: the basket strip is the bottom 120, so the aisle is 480
 * tall. At x = 0.5 an item's centre is at x 171.5, and the basket's centre
 * is at (171.5, 540) — a drag of about 490 straight down reaches it.
 */
const item = (id: number, kind: FallerSpec['kind'], label: string, art: 'bread' | 'soap'): FallerSpec => ({
  id,
  kind,
  label,
  art,
  x: 0.5,
  spawnAtMs: 0,
  travelMs: 10_000,
  direction: 'down',
});
const SPECS = [item(0, 'target', 'Bread', 'bread'), item(1, 'distractor', 'Soap', 'soap')];
const TO_BASKET = 490;

async function renderBoard(onFinish: (r: RoundResult) => void = jest.fn()) {
  const view = await render(
    <BasketBoard specs={SPECS} durationMs={20_000} backdrop={{ uri: 'aisle' }} onFinish={onFinish} />
  );
  await fireEvent(view.getByTestId('aisle'), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: 343, height: 600 } },
  });
  await jest.advanceTimersByTimeAsync(100); // both items now in the aisle
  const counter = () => view.getByText(/in the basket · Score/).props.children as string;
  return { ...view, counter };
}

/**
 * Pick an item up, carry it `dy` down, let go. fireGestureHandler is
 * synchronous and outside act, so let one frame pass for React to redraw.
 */
async function drag(id: number, dy: number) {
  // The board follows the finger's absolute position from touch-down (see
  // Item), so the events carry where the finger is, starting at (100, 100).
  const at = (y: number) => ({ absoluteX: 100, absoluteY: 100 + y, translationX: 0, translationY: y });
  fireGestureHandler(getByGestureTestId(`item-${id}`), [
    { state: State.BEGAN, ...at(0) },
    { state: State.ACTIVE, ...at(0) },
    { state: State.ACTIVE, ...at(dy / 2) },
    { state: State.ACTIVE, ...at(dy) },
    { state: State.END, ...at(dy) },
  ]);
  await jest.advanceTimersByTimeAsync(50);
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('Market Rush basket', () => {
  it('a list item dragged onto the basket goes in and scores', async () => {
    const view = await renderBoard();
    await drag(0, TO_BASKET);
    expect(view.counter()).toBe('1 of 1 in the basket · Score 10');
    expect(view.getByText('+10')).toBeTruthy();
  });

  it('let go out in the aisle, the item goes back and nothing is scored', async () => {
    const view = await renderBoard();
    await drag(0, 150);
    expect(view.counter()).toBe('0 of 1 in the basket · Score 0');
    expect(view.getByLabelText('Bread')).toBeTruthy(); // still there to pick again
  });

  it('a tap puts an item in the basket too — drag is never the only way', async () => {
    const view = await renderBoard();
    await fireEvent.press(view.getByLabelText('Bread'));
    expect(view.counter()).toBe('1 of 1 in the basket · Score 10');
  });

  it('an item not on the list is turned away and counted as a false alarm, not a miss', async () => {
    const onFinish = jest.fn();
    const view = await renderBoard(onFinish);
    await fireEvent.press(view.getByLabelText('Soap'));
    expect(view.getByText('Not on your list')).toBeTruthy();

    await drag(0, TO_BASKET); // then the list item, which ends the turn
    expect(view.getByText('Shopping complete!')).toBeTruthy();

    await jest.advanceTimersByTimeAsync(2500);
    expect(onFinish).toHaveBeenCalledWith(
      // The wrong item came first, at 0 points; the score never goes below 0.
      expect.objectContaining({ hits: 1, misses: 0, falseAlarms: 1, accuracy: 1, score: 10 })
    );
  });

  it('the aisle waits while an item is held', async () => {
    const view = await renderBoard();
    fireGestureHandler(getByGestureTestId('item-1'), [
      { state: State.BEGAN, absoluteX: 100, absoluteY: 100 },
      { state: State.ACTIVE, absoluteX: 100, absoluteY: 120 },
    ]);
    const bread = () => view.getByLabelText('Bread').parent?.parent?.props.style.top as number;
    const before = bread();
    await jest.advanceTimersByTimeAsync(3000); // a slow, three-second carry
    expect(bread()).toBe(before);
  });
});
