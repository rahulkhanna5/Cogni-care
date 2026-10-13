import { fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import Assess from '@/app/(tabs)/assess';

const mockPush = jest.fn();
jest.mock('expo-router', () => {
  const React = require('react');
  return {
    useRouter: () => ({ push: mockPush }),
    useFocusEffect: (cb: () => void) => React.useEffect(cb, [cb]),
  };
});
jest.mock('expo-sqlite', () => ({ useSQLiteContext: () => ({}) }));

let mockHistory: unknown[] = [];
let mockDraft: string | null = null;
jest.mock('@/db/queries', () => ({
  assessmentHistory: async () => mockHistory,
  getSetting: async () => mockDraft,
}));
jest.mock('@/store/session', () => ({
  useSession: (sel: (s: { player: { id: number } }) => unknown) => sel({ player: { id: 1 } }),
}));

const SAFE = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const wrap = (el: React.ReactElement) => <SafeAreaProvider initialMetrics={SAFE}>{el}</SafeAreaProvider>;

const takenDaysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 19).replace('T', ' ');
};
const row = (takenAt: string) => ({
  id: 1,
  player_id: 1,
  taken_at: takenAt,
  total_score: 40,
  band: 'mild',
  attention: 8,
  stm: 8,
  ltm: 8,
  speed: 8,
  adl: 8,
});

beforeEach(() => {
  mockPush.mockClear();
  mockDraft = null;
});

it('after a check-in it is locked: says when it opens and the button does nothing', async () => {
  mockHistory = [row(takenDaysAgo(2))];
  const view = await render(wrap(<Assess />));
  expect(await view.findByText('Done for this week')).toBeTruthy();
  expect(view.getByText(/in 5 days\.$/)).toBeTruthy();
  await fireEvent.press(view.getByText('Start check-in'));
  expect(mockPush).not.toHaveBeenCalled();
});

it('opens again on the seventh day', async () => {
  mockHistory = [row(takenDaysAgo(7))];
  const view = await render(wrap(<Assess />));
  await view.findByText('Start check-in');
  expect(view.queryByText('Done for this week')).toBeNull();
  await fireEvent.press(view.getByText('Start check-in'));
  expect(mockPush).toHaveBeenCalledWith('/assessment');
});

it('a check-in already under way can always be finished', async () => {
  mockHistory = [row(takenDaysAgo(1))];
  mockDraft = JSON.stringify({ 1: 2, 2: 1 });
  const view = await render(wrap(<Assess />));
  await fireEvent.press(await view.findByText('Continue from question 3'));
  expect(mockPush).toHaveBeenCalledWith('/assessment');
});
