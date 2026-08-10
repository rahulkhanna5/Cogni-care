import { fireEvent, render } from '@testing-library/react-native';

import type { RoundResult } from '@/games/shell/types';
import { BlinkTrail } from './BlinkTrail';
import { blinkLevel } from './levels';

/**
 * Level 1 spec: 3x3 grid, 3 lights, 800ms flash, 300ms gap.
 * Timeline before input opens:
 *   600 lead-in + 3 x (800 + 300) + 1000 blank = 4900ms
 */
const LEVEL = 1;
const spec = blinkLevel(LEVEL);
const TIME_TO_INPUT = 600 + spec.length * (spec.flashMs + spec.gapMs) + 1000;

/** Pinned via the makeSeq injection seam rather than by stubbing Math.random. */
const SEQUENCE = [0, 3, 7];

const cellLabel = (index: number) =>
  `Row ${Math.floor(index / spec.grid) + 1}, column ${(index % spec.grid) + 1}`;

// RTL v14 render is async — it must be awaited before anything can be queried.
async function renderGame(onRoundComplete: (r: RoundResult) => void = jest.fn()) {
  const view = await render(
    <BlinkTrail
      level={LEVEL}
      roundNo={1}
      totalRounds={5}
      onRoundComplete={onRoundComplete}
      makeSeq={() => [...SEQUENCE]}
    />
  );
  // No act() wrapper here — RTL v14 auto-wraps, and nesting act scopes leaves
  // React's act queue corrupted for every test that follows.
  const advance = (ms: number) => jest.advanceTimersByTimeAsync(ms);
  // fireEvent is async in RTL v14 too — an un-awaited press leaves a dangling
  // act scope that breaks the next test's render.
  const tap = (cell: number) => fireEvent.press(view.getByLabelText(cellLabel(cell)));
  return { ...view, advance, tap };
}

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(async () => {
  // A trial that is still mid-flight (the 700ms feedback hold, a pending flash)
  // otherwise leaves promise continuations that resolve during the *next* test
  // and corrupt its render. Drain them before handing back the real clock.
  await jest.runOnlyPendingTimersAsync();
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('BlinkTrail', () => {
  /**
   * Regression test. The trial runner previously listed `phase` in its effect
   * dependencies while also setting `phase` mid-run, so the effect cancelled
   * its own in-flight async function during the blank interval and input never
   * opened — the grid stayed permanently untappable on "Get ready…".
   */
  it('opens input after the sequence and the blank interval', async () => {
    const { advance, getByText } = await renderGame();

    expect(getByText('Watch the lights')).toBeTruthy();

    await advance(TIME_TO_INPUT);

    expect(getByText(/Your turn/)).toBeTruthy();
  });

  it('scores a perfect trial when tapped in the right order', async () => {
    const onRoundComplete = jest.fn();
    const { advance, tap } = await renderGame(onRoundComplete);

    await advance(TIME_TO_INPUT);
    for (const cell of SEQUENCE) await tap(cell);
    await advance(1000); // covers the 700ms feedback hold

    expect(onRoundComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        hits: 3,
        misses: 0,
        falseAlarms: 0,
        accuracy: 1,
        score: 3 * 10 + 50, // 10 per hit + perfect bonus
      })
    );
  });

  it('ends the trial on a wrong tap and records it as a false alarm', async () => {
    const onRoundComplete = jest.fn();
    const { advance, tap } = await renderGame(onRoundComplete);

    await advance(TIME_TO_INPUT);
    await tap(1); // not in [0, 3, 7]
    await advance(1000);

    expect(onRoundComplete).toHaveBeenCalledWith(
      expect.objectContaining({ hits: 0, misses: 3, falseAlarms: 1, accuracy: 0 })
    );
  });

  it('counts partial recall correctly', async () => {
    const onRoundComplete = jest.fn();
    const { advance, tap } = await renderGame(onRoundComplete);

    await advance(TIME_TO_INPUT);
    await tap(SEQUENCE[0]); // right
    await tap(SEQUENCE[2]); // right cell, wrong position
    await advance(1000);

    expect(onRoundComplete).toHaveBeenCalledWith(
      expect.objectContaining({ hits: 1, misses: 2, falseAlarms: 1 })
    );
  });

  it('ignores taps before input opens', async () => {
    const onRoundComplete = jest.fn();
    const { advance, tap } = await renderGame(onRoundComplete);

    await tap(0);
    await advance(500); // still in the lead-in

    expect(onRoundComplete).not.toHaveBeenCalled();
  });
});
