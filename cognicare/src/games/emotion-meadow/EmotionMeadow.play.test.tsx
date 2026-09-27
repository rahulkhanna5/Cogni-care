import { fireEvent, render } from '@testing-library/react-native';

import type { RoundResult } from '@/games/shell/types';
import { animalFace, ANIMALS } from './animals';
import { EmotionMeadow, faceKind } from './EmotionMeadow';
import type { Emotion } from './Face';

describe('which faces a trial uses', () => {
  it('uses the animals when they show every feeling in the trial', () => {
    expect(faceKind(['happy', 'sad', 'angry', 'surprised'])).toBe('animal');
  });

  it('falls back to drawn faces for all of them when one feeling has no animal', () => {
    // Mixing would give the answer away: the odd one out needs no reading.
    expect(faceKind(['happy', 'worried', 'sad'])).toBe('drawn');
    expect(faceKind(['calm', 'angry'])).toBe('drawn');
  });

  it('has every animal showing every one of its four feelings', () => {
    const feelings: Emotion[] = ['happy', 'sad', 'angry', 'surprised'];
    for (const animal of ANIMALS) for (const f of feelings) expect(animalFace(animal, f)).toBeTruthy();
  });

  it('shows each feeling as a different picture', () => {
    for (const animal of ANIMALS) {
      const pictures = (['happy', 'sad', 'angry', 'surprised'] as Emotion[]).map((f) => animalFace(animal, f));
      expect(new Set(pictures).size).toBe(4);
    }
  });
});

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('a round of Emotion Meadow with the animals', () => {
  // random = 0 everywhere: trials are [happy, sad, angry] with the answer
  // first, and the round starts on the dog.
  const zero = () => 0;

  // The next trial arrives from a timer, outside act; findByText waits for
  // React to draw it. (Wrapping the timers in act() instead corrupts later
  // tests — see CLAUDE.md.)
  it('asks about one animal at a time, and scores right and wrong picks', async () => {
    const onRoundComplete = jest.fn<void, [RoundResult]>();
    const view = await render(
      <EmotionMeadow level={1} roundNo={1} totalRounds={4} onRoundComplete={onRoundComplete} random={zero} />
    );

    expect(view.getByText('Which dog looks happy?')).toBeTruthy();
    expect(view.getAllByLabelText(/^Face \d$/)).toHaveLength(3);

    await fireEvent.press(view.getByLabelText('Face 1')); // right
    await jest.advanceTimersByTimeAsync(900);
    expect(await view.findByText('Which cat looks happy?')).toBeTruthy(); // next trial, next animal

    await fireEvent.press(view.getByLabelText('Face 2')); // wrong
    await jest.advanceTimersByTimeAsync(900);
    expect(await view.findByText('Which panda looks happy?')).toBeTruthy();

    await fireEvent.press(view.getByLabelText('Face 1'));
    await jest.advanceTimersByTimeAsync(900);
    expect(await view.findByText('Which lion looks happy?')).toBeTruthy();

    await fireEvent.press(view.getByLabelText('Face 1'));
    await jest.advanceTimersByTimeAsync(900);

    expect(onRoundComplete).toHaveBeenCalledWith(
      expect.objectContaining({ hits: 3, falseAlarms: 1, misses: 0, accuracy: 0.75 })
    );
  });
});
