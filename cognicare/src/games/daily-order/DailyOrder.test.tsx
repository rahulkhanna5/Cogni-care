import { fireEvent, render } from '@testing-library/react-native';

import type { RoundResult } from '@/games/shell/types';
import { DailyOrder } from './DailyOrder';
import { buildTrial } from './levels';

// Fixed sequence so the same trial is built in the test as in the component.
const seeded = () => {
  let n = 0;
  return () => {
    n = (n * 9301 + 49297) % 233280;
    return n / 233280;
  };
};

const LEVEL = 3; // 4 steps + 1 distractor

async function renderGame(onRoundComplete: (r: RoundResult) => void = jest.fn()) {
  const trial = buildTrial(LEVEL, seeded());
  const view = await render(
    <DailyOrder
      level={LEVEL}
      roundNo={1}
      totalRounds={4}
      onRoundComplete={onRoundComplete}
      random={seeded()}
    />
  );
  const tap = (label: string) => fireEvent.press(view.getByLabelText(label));
  return { ...view, trial, tap };
}

beforeEach(() => jest.useFakeTimers());
afterEach(async () => {
  await jest.runOnlyPendingTimersAsync();
  jest.clearAllTimers();
  jest.useRealTimers();
});

describe('DailyOrder', () => {
  it('scores a clean run when the steps are tapped in order', async () => {
    const onRoundComplete = jest.fn();
    const { trial, tap } = await renderGame(onRoundComplete);

    for (const step of trial.answer) await tap(step);
    await jest.advanceTimersByTimeAsync(1000);

    expect(onRoundComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        hits: trial.answer.length,
        misses: 0,
        falseAlarms: 0,
        accuracy: 1,
      })
    );
  });

  it('counts a wrong step as a false alarm and keeps the round going', async () => {
    const onRoundComplete = jest.fn();
    const { trial, tap } = await renderGame(onRoundComplete);

    // Second step tapped first — wrong for this position.
    await tap(trial.answer[1]!);
    expect(onRoundComplete).not.toHaveBeenCalled(); // round must NOT end

    for (const step of trial.answer) await tap(step);
    await jest.advanceTimersByTimeAsync(1000);

    const result = onRoundComplete.mock.calls[0]![0] as RoundResult;
    expect(result.falseAlarms).toBe(1);
    // The position they fumbled does not count as a first-try hit, so tapping
    // every option in turn cannot yield a perfect score by elimination.
    expect(result.hits).toBe(trial.answer.length - 1);
  });

  it('ignores a step that has already been placed', async () => {
    const onRoundComplete = jest.fn();
    const { trial, tap, queryByLabelText } = await renderGame(onRoundComplete);

    await tap(trial.answer[0]!);
    // Once placed it leaves the choice list entirely.
    expect(queryByLabelText(trial.answer[0]!)).toBeNull();
  });

  it('does not end the round early when a distractor is present', async () => {
    const onRoundComplete = jest.fn();
    const { trial, tap } = await renderGame(onRoundComplete);

    const distractor = trial.choices.find((c) => !trial.answer.includes(c));
    expect(distractor).toBeDefined();

    await tap(distractor!);
    await jest.advanceTimersByTimeAsync(1000);
    expect(onRoundComplete).not.toHaveBeenCalled();
  });
});
