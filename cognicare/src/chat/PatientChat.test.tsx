import { fireEvent, render } from '@testing-library/react-native';

import { PatientChat } from './PatientChat';

const mockSend = jest.fn(async (..._args: unknown[]) => ({ reply: 'Practise Blink Trail this week.' }));
const mockReport = jest.fn(async (..._args: unknown[]) => ({ reported: true as const }));

jest.mock('@/api/chat.api', () => ({
  sendChatMessage: (...args: unknown[]) => mockSend(...args),
  reportChatReply: (...args: unknown[]) => mockReport(...args),
}));

const mockAuthedFetch = <T,>(fn: (token: string) => Promise<T>) => fn('token');
jest.mock('@/store/auth', () => {
  const state = () => ({ user: { id: 'p1', role: 'PATIENT' }, authedFetch: mockAuthedFetch });
  return { useAuth: (select?: (s: ReturnType<typeof state>) => unknown) => (select ? select(state()) : state()) };
});

beforeEach(() => {
  mockSend.mockClear();
  mockReport.mockClear();
});

it('lets a reply from the assistant be reported, with the question it answered', async () => {
  const view = await render(<PatientChat patientId="p1" suggestions={['What should I practise?']} />);

  await fireEvent.press(view.getByText('What should I practise?'));
  expect(await view.findByText('Practise Blink Trail this week.')).toBeTruthy();

  // Only the assistant's reply carries the link, not the person's own question.
  expect(view.getAllByText('Report this reply')).toHaveLength(1);

  await fireEvent.press(view.getByText('Report this reply'));
  expect(await view.findByText('Reported. Thank you.')).toBeTruthy();
  expect(mockReport).toHaveBeenCalledWith('token', 'p1', {
    reply: 'Practise Blink Trail this week.',
    question: 'What should I practise?',
  });
  expect(view.queryByText('Report this reply')).toBeNull();
});

it('says so when a report could not be sent, and lets it be tried again', async () => {
  mockReport.mockRejectedValueOnce(new Error('offline'));
  const view = await render(<PatientChat patientId="p1" suggestions={['How am I doing?']} />);

  await fireEvent.press(view.getByText('How am I doing?'));
  await fireEvent.press(await view.findByText('Report this reply'));
  expect(await view.findByText('Could not send the report. Please try again.')).toBeTruthy();

  await fireEvent.press(view.getByText('Report this reply'));
  expect(await view.findByText('Reported. Thank you.')).toBeTruthy();
  expect(mockReport).toHaveBeenCalledTimes(2);
});
