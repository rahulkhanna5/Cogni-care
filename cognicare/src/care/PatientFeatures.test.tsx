import { fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { MyAssignment } from '@/api/care.api';
import type { Remark } from '@/api/doctor.api';
import { toIso } from '@/db/stats';
import { RemarksPanel } from './doctor/RemarksPanel';
import { RateDoctor } from './RateDoctor';

const mockRate = jest.fn(async (..._a: unknown[]) => ({ review: { rating: 4, comment: null } }));
jest.mock('@/api/care.api', () => ({ rateDoctor: (...a: unknown[]) => mockRate(...a) }));

const mockShare = jest.fn(async (..._a: unknown[]) => ({ remark: { id: 'r1', visible_to_patient: true } }));
jest.mock('@/api/doctor.api', () => ({
  setRemarkVisibility: (...a: unknown[]) => mockShare(...a),
  draftRemark: jest.fn(),
  saveRemark: jest.fn(),
}));

const mockAuthedFetch = <T,>(fn: (token: string) => Promise<T>) => fn('token');
jest.mock('@/store/auth', () => {
  const state = () => ({ user: { id: 'd1', role: 'DOCTOR', name: 'Dr Rao' }, authedFetch: mockAuthedFetch });
  return { useAuth: (select?: (s: ReturnType<typeof state>) => unknown) => (select ? select(state()) : state()) };
});

const SAFE = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const wrap = (el: React.ReactElement) => <SafeAreaProvider initialMetrics={SAFE}>{el}</SafeAreaProvider>;

const connected: MyAssignment = {
  id: 'a1',
  status: 'ACTIVE',
  requested_at: '2026-10-01T00:00:00Z',
  approved_at: '2026-10-02T00:00:00Z',
  revoked_at: null,
  doctor_accepted_at: '2026-10-02T00:00:00Z',
  doctor_id: 'd1',
  doctor_name: 'Dr Rao',
};

it('a patient rates a doctor: no stars, no save; stars and comment are sent for that connection', async () => {
  const onSaved = jest.fn();
  const view = await render(wrap(<RateDoctor assignment={connected} onSaved={onSaved} />));
  await fireEvent.press(view.getByText('Rate Dr Rao'));
  await fireEvent.press(view.getByText('Save rating'));
  expect(mockRate).not.toHaveBeenCalled();

  await fireEvent.press(view.getByLabelText('4 stars, Good'));
  await fireEvent.changeText(view.getByLabelText('Anything to add? (optional)'), 'Very patient with me');
  await fireEvent.press(view.getByText('Save rating'));
  expect(mockRate).toHaveBeenCalledWith('token', 'a1', 4, 'Very patient with me');
  expect(onSaved).toHaveBeenCalled();
  expect(view.getByText('Thank you. Your rating is saved.')).toBeTruthy();
});

it('shows an existing rating so it can be changed', async () => {
  const view = await render(wrap(<RateDoctor assignment={{ ...connected, my_rating: 5 }} onSaved={jest.fn()} />));
  expect(view.getByText('Your rating: 5 of 5 · Change')).toBeTruthy();
});

const note = (o: Partial<Remark>): Remark => ({
  id: 'r1',
  body: 'Good progress on memory games.',
  plan: null,
  created_at: '2026-10-10T00:00:00Z',
  visible_to_patient: false,
  author_id: 'd1',
  author_name: 'Dr Rao',
  ...o,
});

it('the doctor who wrote a note can share it; a colleague’s note only says whether it is shared', async () => {
  const onChanged = jest.fn();
  const view = await render(
    wrap(
      <RemarksPanel
        patientId="p1"
        remarks={[note({}), note({ id: 'r2', author_id: 'd2', author_name: 'Dr Iyer', visible_to_patient: true })]}
        onAdded={jest.fn()}
        onChanged={onChanged}
      />
    )
  );
  expect(view.getAllByRole('checkbox')).toHaveLength(1);
  expect(view.getByText('Shared with the patient')).toBeTruthy(); // Dr Iyer's, read-only

  await fireEvent.press(view.getByRole('checkbox'));
  expect(mockShare).toHaveBeenCalledWith('token', 'p1', 'r1', true);
  expect(onChanged).toHaveBeenCalledWith('r1', true);
});

it('reads on-device dates as UTC, in a form every engine parses', () => {
  expect(toIso('2026-10-13 09:30:00')).toBe('2026-10-13T09:30:00Z');
  expect(toIso('2026-10-13T09:30:00Z')).toBe('2026-10-13T09:30:00Z');
  expect(new Date(toIso('2026-10-13 09:30:00')).getUTCHours()).toBe(9);
});
