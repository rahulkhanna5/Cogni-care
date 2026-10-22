import { fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import Admin from '@/app/(tabs)/admin';

const mockPush = jest.fn();
jest.mock('expo-router', () => {
  const React = require('react');
  return {
    useRouter: () => ({ push: mockPush, back: jest.fn() }),
    useFocusEffect: (cb: () => void) => React.useEffect(cb, [cb]),
  };
});

jest.mock('@/api/admin.api', () => {
  const actual = jest.requireActual('@/api/admin.api');
  return {
    ...actual,
    pendingDoctors: async () => ({ doctors: [] }),
    listAssignments: async () => ({ assignments: [] }),
    listAllPatients: async () => ({
      patients: [
        {
          id: 'p1',
          name: 'Asha',
          email: 'asha@x.com',
          created_at: '2026-09-01T00:00:00Z',
          is_active: true,
          sessions: 12,
          last_played_at: null,
          accuracy_30d: 0.81,
          latest_band: 'mild',
          latest_score: 30,
          latest_check_in: '2026-10-01T00:00:00Z',
          doctors: [
            { assignment_id: 'a1', doctor_id: 'd1', doctor_name: 'Dr Rao', status: 'ACTIVE', doctor_accepted_at: 'x' },
          ],
        },
      ],
    }),
    listAllDoctors: async () => ({
      doctors: [
        {
          id: 'd1',
          name: 'Dr Rao',
          email: 'rao@x.com',
          created_at: '2026-09-01T00:00:00Z',
          approved_at: '2026-09-02T00:00:00Z',
          is_active: true,
          specialty: 'Neurology',
          license_number: 'N1',
          patients: 1,
          waiting: 0,
        },
      ],
    }),
    allAssignments: async () => ({
      assignments: [
        {
          id: 'a1',
          doctor_id: 'd1',
          patient_id: 'p1',
          status: 'ACTIVE',
          requested_at: '2026-09-10T00:00:00Z',
          approved_at: '2026-09-11T00:00:00Z',
          doctor_accepted_at: '2026-09-12T00:00:00Z',
          revoked_at: null,
          doctor_name: 'Dr Rao',
          patient_name: 'Asha',
        },
      ],
    }),
  };
});

const mockAuthedFetch = <T,>(fn: (token: string) => Promise<T>) => fn('token');
jest.mock('@/store/auth', () => {
  const state = () => ({ user: { id: 'admin', role: 'ADMIN', name: 'Admin' }, authedFetch: mockAuthedFetch });
  return { useAuth: (select?: (s: ReturnType<typeof state>) => unknown) => (select ? select(state()) : state()) };
});

const SAFE = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const wrap = (el: React.ReactElement) => <SafeAreaProvider initialMetrics={SAFE}>{el}</SafeAreaProvider>;

it('shows the counts, then connections, patients and specialists, each opening its detail', async () => {
  const view = await render(wrap(<Admin />));
  expect(await view.findByLabelText('Patients: 1')).toBeTruthy();
  expect(view.getByLabelText('Connected: 1')).toBeTruthy();

  await fireEvent.press(view.getByRole('tab', { name: 'Connections' }));
  expect(view.getByText('Connected (1)')).toBeTruthy();
  expect(view.getByText(/specialist accepted/)).toBeTruthy();

  await fireEvent.press(view.getByRole('tab', { name: 'Patients' }));
  expect(view.getByText('asha@x.com')).toBeTruthy();
  expect(view.getByText('81%')).toBeTruthy();
  await fireEvent.press(view.getByLabelText('Asha. Open details'));
  expect(mockPush).toHaveBeenLastCalledWith({ pathname: '/patient/[id]', params: { id: 'p1' } });

  await fireEvent.press(view.getByRole('tab', { name: 'Specialists' }));
  expect(view.getByText(/Approved/)).toBeTruthy();
  await fireEvent.press(view.getByLabelText('Dr Rao. Open details'));
  expect(mockPush).toHaveBeenLastCalledWith({ pathname: '/admin-doctor/[id]', params: { id: 'd1' } });
});
