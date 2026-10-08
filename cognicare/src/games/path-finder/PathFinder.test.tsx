import { fireEvent, render } from '@testing-library/react-native';
import { Dimensions } from 'react-native';
import { State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';

import type { RoundResult } from '@/games/shell/types';
import { space } from '@/theme/tokens';
import { fitCity } from './city/projection';
import { LEVEL_1 } from './data/level1';
import { PathFinder } from './PathFinder';

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

const play = (roundNo: number, onRoundComplete = jest.fn<void, [RoundResult]>()) =>
  render(<PathFinder level={1} roundNo={roundNo} totalRounds={3} onRoundComplete={onRoundComplete} />);

it('walks to the clinic by the best route, checks it, and reports a perfect turn', async () => {
  const done = jest.fn<void, [RoundResult]>();
  const view = await play(1, done);
  expect(view.getByText(/Walk 1 of 3 · Walk to the clinic/)).toBeTruthy();

  for (const id of ['d3', 'c3', 'c2', 'b2']) await fireEvent.press(view.getByTestId(`node-${id}`));
  expect(view.getByLabelText('Distance: 400 m')).toBeTruthy();

  await fireEvent.press(view.getByText('Check route'));
  expect(view.getByText('Great planning!')).toBeTruthy();
  expect(view.getByText('100 / 100')).toBeTruthy();

  await fireEvent.press(view.getByText('Continue'));
  expect(done).toHaveBeenCalledWith(
    expect.objectContaining({ hits: 1, misses: 0, falseAlarms: 0, accuracy: 1, score: 100 })
  );
});

it('will not cross the bridge under roadworks, and says why', async () => {
  const view = await play(1);
  await fireEvent.press(view.getByTestId('node-c2'));
  expect(view.getByText('Roadworks — this road is closed. Find a way round.')).toBeTruthy();

  await jest.advanceTimersByTimeAsync(2600);
  expect(await view.findByLabelText('Distance: 0 m')).toBeTruthy();
  expect(view.getByText('Walk all the way to the clinic first.')).toBeTruthy();
});

it('a tap on the map near a crossroad walks there', async () => {
  const view = await play(1);
  const { width, height } = Dimensions.get('window');
  const fit = fitCity(LEVEL_1.bounds, width - space.gutter * 2, Math.max(260, height - 470));
  const d3 = fit.toScreen({ x: 3, y: 3 });

  fireGestureHandler(getByGestureTestId('city-map'), [
    { state: State.BEGAN, x: d3.x + 12, y: d3.y - 8 },
    { state: State.ACTIVE, x: d3.x + 12, y: d3.y - 8 },
    { state: State.END, x: d3.x + 12, y: d3.y - 8 },
  ]);
  expect(await view.findByLabelText('Distance: 100 m')).toBeTruthy();
});

it('the busy road gets you there, but costs safety and is explained', async () => {
  const done = jest.fn<void, [RoundResult]>();
  const view = await play(2, done);
  for (const id of ['b1', 'b0', 'a0']) await fireEvent.press(view.getByTestId(`node-${id}`));
  expect(view.getByLabelText('Safety: Busy road')).toBeTruthy();

  await fireEvent.press(view.getByText('Check route'));
  expect(view.getByText('You made it!')).toBeTruthy();
  expect(view.getByText('Your route used the busy road. The quiet streets are safer.')).toBeTruthy();

  await fireEvent.press(view.getByText('Continue'));
  expect(done).toHaveBeenCalledWith(expect.objectContaining({ hits: 0, misses: 0, falseAlarms: 2, score: 80 }));
});
