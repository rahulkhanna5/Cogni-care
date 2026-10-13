import { render } from '@testing-library/react-native';

import { SessionBars } from './SessionBars';

it('writes each session as a labelled bar: percent on top, date and level below', async () => {
  const view = await render(
    <SessionBars
      points={[
        { at: '2026-09-28T10:00:00Z', accuracy: 0.64, level: 2 },
        { at: '2026-10-13T10:00:00Z', accuracy: 0.9, level: 3 },
      ]}
    />
  );
  expect(view.getByText('Each bar is one session. Taller means more answers right.')).toBeTruthy();
  expect(view.getByText('64%')).toBeTruthy();
  expect(view.getByText('90%')).toBeTruthy();
  expect(view.getByText('L2')).toBeTruthy();
  expect(view.getByText('L3')).toBeTruthy();
  expect(view.getByText('100%')).toBeTruthy(); // the scale
  expect(view.getByLabelText(/level 3, 90% right/)).toBeTruthy();
});

it('draws nothing without sessions', async () => {
  const view = await render(<SessionBars points={[]} />);
  expect(view.toJSON()).toBeNull();
});
