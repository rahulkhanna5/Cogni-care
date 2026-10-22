import { fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import Settings from '@/app/settings';
import { ApiError } from '@/api/client';
import { useLanguage } from './index';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: mockReplace, push: jest.fn(), back: jest.fn() }) }));

const mockSetSetting = jest.fn(async () => undefined);
const mockErase = jest.fn(async () => undefined);
jest.mock('@/db/queries', () => ({
  setSetting: (...a: unknown[]) => mockSetSetting(...(a as [])),
  getSetting: async () => null,
  eraseDevice: () => mockErase(),
}));
jest.mock('expo-sqlite', () => ({ useSQLiteContext: () => ({}) }));

const mockDelete = jest.fn();
jest.mock('@/api/auth.api', () => ({ deleteAccount: (...a: unknown[]) => mockDelete(...a) }));

let mockRole = 'PATIENT';
const mockSignOut = jest.fn(async () => undefined);
jest.mock('@/store/auth', () => ({
  useAuth: () => ({ user: { id: 'u1', role: mockRole, name: 'Asha' }, accessToken: 'tok', signOut: mockSignOut }),
}));

const SAFE = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const wrap = (el: React.ReactElement) => <SafeAreaProvider initialMetrics={SAFE}>{el}</SafeAreaProvider>;

beforeEach(() => {
  jest.clearAllMocks();
  mockRole = 'PATIENT';
  useLanguage.getState().set('en');
});

it('switching to Hindi changes the words at once and is remembered', async () => {
  const view = await render(wrap(<Settings />));
  await fireEvent.press(view.getByText('हिन्दी'));
  expect(view.getByText('सेटिंग्स')).toBeTruthy();
  expect(mockSetSetting).toHaveBeenCalledWith({}, 'language', 'hi');
});

it('a member deletes their account only after the password, then is signed out and the phone erased', async () => {
  mockDelete.mockResolvedValueOnce({ deleted: true, closed: false });
  const view = await render(wrap(<Settings />));
  await fireEvent.press(view.getByText('Delete my account'));
  await fireEvent.press(view.getByText('Delete for ever'));
  expect(mockDelete).not.toHaveBeenCalled(); // no password yet

  await fireEvent.changeText(view.getByLabelText('Type your password to confirm'), 'secret-pass');
  await fireEvent.press(view.getByText('Delete for ever'));
  expect(mockDelete).toHaveBeenCalledWith('tok', 'secret-pass');
  expect(mockErase).toHaveBeenCalled();
  expect(mockSignOut).toHaveBeenCalled();
  expect(mockReplace).toHaveBeenCalledWith('/login');
});

it('a wrong password says so and deletes nothing', async () => {
  mockDelete.mockRejectedValueOnce(new ApiError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.'));
  const view = await render(wrap(<Settings />));
  await fireEvent.press(view.getByText('Delete my account'));
  await fireEvent.changeText(view.getByLabelText('Type your password to confirm'), 'wrong');
  await fireEvent.press(view.getByText('Delete for ever'));
  expect(await view.findByText('That password is not right.')).toBeTruthy();
  expect(mockSignOut).not.toHaveBeenCalled();
});

it('a specialist closes rather than deletes, and keeps the phone data', async () => {
  mockRole = 'DOCTOR';
  mockDelete.mockResolvedValueOnce({ deleted: false, closed: true });
  const view = await render(wrap(<Settings />));
  expect(view.getByText(/Notes you wrote stay in your members’ records/)).toBeTruthy();
  await fireEvent.press(view.getByText('Close my specialist account'));
  await fireEvent.changeText(view.getByLabelText('Type your password to confirm'), 'pw');
  await fireEvent.press(view.getByText('Close my account'));
  expect(mockDelete).toHaveBeenCalled();
  expect(mockErase).not.toHaveBeenCalled();
});

it('erasing the phone asks twice', async () => {
  const view = await render(wrap(<Settings />));
  await fireEvent.press(view.getByText('Erase everything on this phone'));
  expect(mockErase).not.toHaveBeenCalled();
  await fireEvent.press(view.getByText('Yes, erase this phone'));
  expect(mockErase).toHaveBeenCalled();
  expect(view.getByText('Everything on this phone has been erased.')).toBeTruthy();
});
