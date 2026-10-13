import { fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { PatientSummary, ServerAssessment, ServerSession } from '@/api/doctor.api';
import PatientDetail from '@/app/patient/[id]';
import Patients from '@/app/(tabs)/patients';

jest.mock('expo-router', () => {
  const React = require('react');
  return {
    useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
    useLocalSearchParams: () => ({ id: 'p-zoya' }),
    useFocusEffect: (cb: () => void) => React.useEffect(cb, [cb]),
  };
});

const DAY = 86_400_000;
const ago = (days: number) => new Date(Date.now() - days * DAY).toISOString();

const patients: PatientSummary[] = [
  { id: 'p-asha', name: 'Asha', email: 'asha@x.com', created_at: ago(90) },
  { id: 'p-zoya', name: 'Zoya', email: 'zoya@x.com', created_at: ago(90) },
];

const session = (daysBack: number, accuracy: number): ServerSession => ({
  id: `s${daysBack}`,
  patient_id: 'p',
  game_id: 'blink-trail',
  started_at: ago(daysBack),
  ended_at: ago(daysBack),
  level_start: 2,
  level_end: 3,
  accuracy,
  score: 40,
  avg_reaction_ms: 800,
});

const checkIn = (daysBack: number, total: number, band: ServerAssessment['band']): ServerAssessment => ({
  id: `c${daysBack}`,
  patient_id: 'p',
  taken_at: ago(daysBack),
  total_score: total,
  band,
  attention: 6,
  stm: 6,
  ltm: 6,
  speed: 6,
  adl: 6,
});

// Asha plays every couple of days; Zoya has not played for three weeks.
const sessionsFor: Record<string, ServerSession[]> = {
  'p-asha': [1, 2, 4, 6].map((d) => session(d, 0.85)),
  'p-zoya': [21, 24, 28].map((d) => session(d, 0.7)),
};
const checkInsFor: Record<string, ServerAssessment[]> = {
  'p-asha': [checkIn(3, 30, 'mild')],
  'p-zoya': [checkIn(20, 48, 'moderate'), checkIn(60, 40, 'mild')],
};

jest.mock('@/api/doctor.api', () => ({
  listPatients: async () => ({ patients: mockPatients }),
  getPatient: async (_t: string, id: string) => ({ patient: mockPatients.find((p) => p.id === id) }),
  getSessions: async (_t: string, id: string) => ({ sessions: mockSessionsFor[id] ?? [] }),
  getAssessments: async (_t: string, id: string) => ({ assessments: mockCheckInsFor[id] ?? [] }),
  listRemarks: async () => ({ remarks: [] }),
  myRequests: async () => ({ assignments: mockWaiting }),
  awaitingMe: (all: { status: string; doctor_accepted_at?: string | null }[]) =>
    all.filter((r) => r.status === 'ACTIVE' && r.doctor_accepted_at === null),
  acceptRequest: async () => ({ assignment: {} }),
  declineRequest: async () => ({ assignment: {} }),
}));
const mockWaiting = [
  {
    id: 'a-new',
    status: 'ACTIVE',
    requested_at: ago(2),
    approved_at: ago(1),
    doctor_accepted_at: null,
    patient_id: 'p-new',
    patient_name: 'Nila',
  },
];
const mockPatients = patients;
const mockSessionsFor = sessionsFor;
const mockCheckInsFor = checkInsFor;

const mockAuthedFetch = <T,>(fn: (token: string) => Promise<T>) => fn('token');
jest.mock('@/store/auth', () => {
  // Read lazily: this factory runs at import time, before the helper above exists.
  const state = () => ({ user: { id: 'd1', role: 'DOCTOR', name: 'Dr Rao' }, authedFetch: mockAuthedFetch });
  return { useAuth: (select?: (s: ReturnType<typeof state>) => unknown) => (select ? select(state()) : state()) };
});

const SAFE = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const wrap = (el: React.ReactElement) => <SafeAreaProvider initialMetrics={SAFE}>{el}</SafeAreaProvider>;

describe('the doctor’s patient list', () => {
  it('puts the patient who needs a look first, and says why', async () => {
    const view = await render(wrap(<Patients />));
    expect(await view.findByText('Has not played in 21 days')).toBeTruthy();
    expect(await view.findByText('Check-in 8 points worse')).toBeTruthy();
    expect(await view.findByText('Nothing stands out')).toBeTruthy();

    const names = view
      .getAllByRole('button')
      .map((b) => b.props.accessibilityLabel as string | undefined)
      .filter((n): n is string => !!n && /^(Zoya|Asha)/.test(n));
    expect(names[0]).toMatch(/^Zoya/);
    expect(names[1]).toMatch(/^Asha/);
    expect(view.getByText('2 patients · 1 to look at')).toBeTruthy();
  });
});

describe('requests waiting on the doctor', () => {
  it('shows the patient who asked, above the list, with Accept and Decline', async () => {
    const view = await render(wrap(<Patients />));
    expect(await view.findByText('1 patient is waiting for your answer')).toBeTruthy();
    expect(view.getByText('Nila')).toBeTruthy();
    expect(view.getByText('Accept')).toBeTruthy();
    expect(view.getByText('Decline')).toBeTruthy();
  });
});

describe('one patient', () => {
  it('opens on a plain-language summary, then the detail sits behind tabs', async () => {
    const view = await render(wrap(<PatientDetail />));

    // The answer first.
    expect(await view.findByText(/Last played 21 days ago/)).toBeTruthy();
    expect(view.getByText('Worth a look')).toBeTruthy();
    expect(view.getByText('Has not played in 21 days')).toBeTruthy();
    expect(view.getByLabelText(/^Check-in: Moderate/)).toBeTruthy();

    // Check-ins tab says which way is good.
    await fireEvent.press(view.getByText('Check-ins'));
    expect(view.getByText('Self-reported difficulty. Lower is better.')).toBeTruthy();
    expect(view.getByText(/^Taken .* · 8 points worse than the last one$/)).toBeTruthy();

    // Games tab says the opposite.
    await fireEvent.press(view.getByText('Games'));
    expect(view.getByText('Accuracy in the exercises. Higher is better.')).toBeTruthy();
    // Zoya has played three sessions, last 21 days ago, so there is no direction yet.
    expect(view.getByText(/not enough sessions yet to show a direction/)).toBeTruthy();

    // Notes.
    await fireEvent.press(view.getByText('Notes'));
    expect(view.getByText('No notes yet.')).toBeTruthy();
    expect(view.getByText('Write a note')).toBeTruthy();
  });
});
