import { fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useLanguage } from '@/i18n';
import { useThemeMode } from '@/theme/mode';
import { colors, PALETTES } from '@/theme/tokens';
import { TopBar } from './TopBar';

const mockSave = jest.fn(async () => undefined);
jest.mock('@/db/queries', () => ({
  setSetting: (...a: unknown[]) => mockSave(...(a as [])),
  getSetting: async () => null,
}));
jest.mock('expo-sqlite', () => ({ useSQLiteContext: () => ({}) }));
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: mockReplace }) }));

const SAFE = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const wrap = (el: React.ReactElement) => <SafeAreaProvider initialMetrics={SAFE}>{el}</SafeAreaProvider>;

afterEach(() => {
  useThemeMode.getState().set('light');
  useLanguage.getState().set('en');
});

it('the theme button switches the whole palette to dark and back, and remembers it', async () => {
  const view = await render(wrap(<TopBar />));
  await fireEvent.press(view.getByLabelText('Switch to dark theme'));
  expect(useThemeMode.getState().mode).toBe('dark');
  expect(colors.bg).toBe(PALETTES.dark.bg);
  expect(mockSave).toHaveBeenCalledWith({}, 'theme', 'dark');
  expect(mockReplace).toHaveBeenCalledWith('/'); // screens rebuilt with the new palette

  useThemeMode.getState().set('light');
  expect(colors.bg).toBe(PALETTES.light.bg);
});

it('the language button opens three choices, each in its own script, and switches to Punjabi', async () => {
  const view = await render(wrap(<TopBar />));
  await fireEvent.press(view.getByLabelText('Change language'));
  expect(view.getByText('हिन्दी')).toBeTruthy();
  expect(view.getByText('English')).toBeTruthy();
  await fireEvent.press(view.getByText('ਪੰਜਾਬੀ'));
  expect(useLanguage.getState().lang).toBe('pa');
  expect(mockSave).toHaveBeenCalledWith({}, 'language', 'pa');
  expect(view.getByLabelText('ਭਾਸ਼ਾ ਬਦਲੋ')).toBeTruthy(); // the bar itself is now in Punjabi
});
