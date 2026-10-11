import { fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { DirectoryDoctor, MyAssignment } from '@/api/care.api';
import FindDoctor from '@/app/find-doctor';

const mockPush = jest.fn();

const SAFE = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const screen = () => (
  <SafeAreaProvider initialMetrics={SAFE}>
    <FindDoctor />
  </SafeAreaProvider>
);
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: mockPush }),
  useFocusEffect: jest.fn(),
}));

// A tiny stand-in server: doctors to list, and requests that grow when asked.
let mockDoctors: DirectoryDoctor[] = [];
let mockAssignments: MyAssignment[] = [];
const mockRequestDoctor = jest.fn(async (_token: string, doctorId: string) => {
  mockAssignments = [
    ...mockAssignments,
    {
      id: `a-${doctorId}`,
      status: 'PENDING',
      requested_at: '2026-10-10T10:00:00Z',
      approved_at: null,
      revoked_at: null,
      doctor_id: doctorId,
      doctor_name: mockDoctors.find((d) => d.id === doctorId)!.name,
    },
  ];
  return { assignment: { id: `a-${doctorId}`, status: 'PENDING' as const } };
});

const mockListDoctors = jest.fn(async (..._args: unknown[]) => ({ doctors: mockDoctors }));

jest.mock('@/api/care.api', () => ({
  listDoctors: (...args: unknown[]) => mockListDoctors(...args),
  myAssignments: async () => ({ assignments: mockAssignments }),
  requestDoctor: (...args: [string, string]) => mockRequestDoctor(...args),
  stopSharing: jest.fn(),
}));

let mockSignedIn = true;
// One stable function, as in the real store — a new one per render would
// re-run every effect that lists it as a dependency.
const mockAuthedFetch = <T,>(fn: (token: string) => Promise<T>) => fn('token');
jest.mock('@/store/auth', () => {
  const state = () => ({
    user: mockSignedIn ? { id: 'p1', role: 'PATIENT', name: 'Asha' } : null,
    authedFetch: mockAuthedFetch,
  });
  return { useAuth: (select?: (s: ReturnType<typeof state>) => unknown) => (select ? select(state()) : state()) };
});

beforeEach(() => {
  mockSignedIn = true;
  mockAssignments = [];
  mockRequestDoctor.mockClear();
  mockListDoctors.mockClear();
  mockDoctors = [
    { id: 'd1', name: 'Dr Rao', specialty: 'Neurology', bio: 'Memory clinic lead.' },
    { id: 'd2', name: 'Dr Iyer', specialty: null, bio: null },
  ];
});

it('lists the approved doctors, and asking one sends the request and shows it waiting', async () => {
  const view = await render(screen());
  expect(await view.findByText('Dr Rao')).toBeTruthy();
  expect(view.getByText('Neurology')).toBeTruthy();
  expect(view.getByText('Memory clinic lead.')).toBeTruthy();
  expect(view.getByText('Dr Iyer')).toBeTruthy();

  const buttons = view.getAllByLabelText('Ask this doctor');
  expect(buttons).toHaveLength(2);
  await fireEvent.press(buttons[0]);

  expect(mockRequestDoctor).toHaveBeenCalledWith('token', 'd1');
  expect(await view.findByText('Request sent · waiting for approval')).toBeTruthy();
  // Only the first doctor was asked; the other can still be asked.
  expect(view.getAllByLabelText('Ask this doctor')).toHaveLength(1);
});

it('says there are no doctors yet, rather than showing an empty page', async () => {
  mockDoctors = [];
  const view = await render(screen());
  expect(await view.findByText('No doctors yet')).toBeTruthy();
});

it('asks someone who is not signed in to sign in first, without calling the server', async () => {
  mockSignedIn = false;
  const view = await render(screen());
  expect(await view.findByText('Sign in first')).toBeTruthy();
  expect(mockListDoctors).not.toHaveBeenCalled();
  await fireEvent.press(view.getByText('Sign in or create an account'));
  expect(mockPush).toHaveBeenCalledWith('/login');
});
