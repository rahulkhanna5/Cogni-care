import { render } from '@testing-library/react-native';

import { ActionCard } from '@/games/shared/ActionCard';
import { SCENES, stepPicture } from './scenes';
import { TASKS } from './tasks';

const everyStep = TASKS.flatMap((t) => [...t.steps, ...t.distractors]);

it('every step and every wrong step that ships has a picture', () => {
  expect(everyStep.filter((s) => !SCENES[s])).toEqual([]);
});

it('every picture belongs to a step — a typo in a key would silently orphan it', () => {
  expect(Object.keys(SCENES).filter((k) => !everyStep.includes(k))).toEqual([]);
});

it('every scene draws without throwing', async () => {
  for (const step of everyStep) await render(<>{stepPicture(step)}</>);
});

it('a step with no picture yet still shows a card: the routine’s icon and its words', async () => {
  expect(stepPicture('Feed the cat')).toBeUndefined();
  const view = await render(
    <ActionCard
      text="Feed the cat"
      picture={stepPicture('Feed the cat')}
      fallbackIcon="paw-outline"
      state="available"
      width={160}
      onPress={jest.fn()}
    />
  );
  expect(view.getByTestId('action-card-fallback')).toBeTruthy();
  expect(view.getByLabelText('Feed the cat')).toBeTruthy();
});
