import { fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { MyRequest } from '@/api/doctor.api';
import { IncomingRequests } from './IncomingRequests';

const mockAccept = jest.fn(async (_t: string, _id: string) => ({ assignment: {} }));
const mockDecline = jest.fn(async (_t: string, _id: string) => ({ assignment: {} }));
jest.mock('@/api/doctor.api', () => ({
  acceptRequest: (t: string, id: string) => mockAccept(t, id),
  declineRequest: (t: string, id: string) => mockDecline(t, id),
}));

const mockAuthedFetch = <T,>(fn: (token: string) => Promise<T>) => fn('token');
jest.mock('@/store/auth', () => {
  const state = () => ({ user: { id: 'd1', role: 'DOCTOR', name: 'Dr Rao' }, authedFetch: mockAuthedFetch });
  return { useAuth: (select?: (s: ReturnType<typeof state>) => unknown) => (select ? select(state()) : state()) };
});

const SAFE = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const wrap = (el: React.ReactElement) => <SafeAreaProvider initialMetrics={SAFE}>{el}</SafeAreaProvider>;

const request = (over: Partial<MyRequest> = {}): MyRequest => ({
  id: 'a1',
  status: 'ACTIVE',
  requested_at: '2026-10-12T09:00:00Z',
  approved_at: '2026-10-13T09:00:00Z',
  doctor_accepted_at: null,
  patient_id: 'p1',
  patient_name: 'Meera',
  ...over,
});

beforeEach(() => {
  mockAccept.mockClear();
  mockDecline.mockClear();
});

it('draws nothing when no one is waiting', async () => {
  const view = await render(wrap(<IncomingRequests requests={[]} onAnswered={jest.fn()} />));
  expect(view.queryByText(/waiting for your answer/)).toBeNull();
});

it('names the member and says what accepting means', async () => {
  const view = await render(wrap(<IncomingRequests requests={[request()]} onAnswered={jest.fn()} />));
  expect(view.getByText('1 member is waiting for your answer')).toBeTruthy();
  expect(view.getByText('Meera')).toBeTruthy();
  expect(view.getByText(/approved by an administrator/)).toBeTruthy();
  expect(view.getByText(/If you decline, nothing is shared/)).toBeTruthy();
});

it('a request still with the administrator can be answered, and says so', async () => {
  const view = await render(
    wrap(<IncomingRequests requests={[request({ status: 'PENDING', approved_at: null })]} onAnswered={jest.fn()} />)
  );
  expect(view.getByText(/an administrator is also checking it/)).toBeTruthy();
  expect(view.getByText(/once an administrator approves too/)).toBeTruthy();
  expect(view.getByText('Accept')).toBeTruthy();
});

it('one the specialist already accepted shows as waiting for the administrator, with no buttons', async () => {
  const view = await render(
    wrap(
      <IncomingRequests
        requests={[]}
        accepted={[request({ status: 'PENDING', approved_at: null, doctor_accepted_at: '2026-10-13T10:00:00Z' })]}
        onAnswered={jest.fn()}
      />
    )
  );
  expect(view.getByText('You accepted · waiting for an administrator to approve')).toBeTruthy();
  expect(view.queryByText('Accept')).toBeNull();
});

it('Accept sends that request id and tells the screen to reload', async () => {
  const onAnswered = jest.fn();
  const view = await render(wrap(<IncomingRequests requests={[request()]} onAnswered={onAnswered} />));
  await fireEvent.press(view.getByText('Accept'));
  expect(mockAccept).toHaveBeenCalledWith('token', 'a1');
  expect(mockDecline).not.toHaveBeenCalled();
  expect(onAnswered).toHaveBeenCalled();
});

it('Decline sends the decline, not the accept', async () => {
  const onAnswered = jest.fn();
  const view = await render(wrap(<IncomingRequests requests={[request()]} onAnswered={onAnswered} />));
  await fireEvent.press(view.getByText('Decline'));
  expect(mockDecline).toHaveBeenCalledWith('token', 'a1');
  expect(mockAccept).not.toHaveBeenCalled();
  expect(onAnswered).toHaveBeenCalled();
});

it('says so, and keeps the card, when the answer could not be sent', async () => {
  mockAccept.mockRejectedValueOnce(new Error('network'));
  const onAnswered = jest.fn();
  const view = await render(wrap(<IncomingRequests requests={[request()]} onAnswered={onAnswered} />));
  await fireEvent.press(view.getByText('Accept'));
  expect(await view.findByText('Could not send your answer. Please try again.')).toBeTruthy();
  expect(onAnswered).not.toHaveBeenCalled();
  expect(view.getByText('Accept')).toBeTruthy();
});
