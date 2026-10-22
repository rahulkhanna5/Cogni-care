import { fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import Register from '@/app/(auth)/register';
import { LEGAL_VERSION, PRIVACY, TERMS } from './content';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
}));

const mockRegister = jest.fn(async (_input: unknown) => ({ user: {}, nextStep: 'SIGN_IN' }));
jest.mock('@/api/auth.api', () => ({
  register: (input: unknown) => mockRegister(input),
  verifyEmail: jest.fn(),
}));

const mockSignIn = jest.fn(async () => ({}));
jest.mock('@/store/auth', () => ({
  useAuth: (select: (s: { signIn: typeof mockSignIn }) => unknown) => select({ signIn: mockSignIn }),
}));

const SAFE = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const wrap = (el: React.ReactElement) => <SafeAreaProvider initialMetrics={SAFE}>{el}</SafeAreaProvider>;

beforeEach(() => {
  mockRegister.mockClear();
  mockPush.mockClear();
});

async function fillPatient(view: Awaited<ReturnType<typeof render>>) {
  await fireEvent.changeText(view.getByLabelText('Full name'), 'Asha Rao');
  await fireEvent.changeText(view.getByLabelText('Email'), 'asha@example.com');
  await fireEvent.changeText(view.getByLabelText('Password (at least 10 characters)'), 'long-enough-pass');
}

it('will not create an account until both required boxes are ticked, and records the version agreed to', async () => {
  const view = await render(wrap(<Register />));
  await fillPatient(view);

  expect(view.getByText('Tick the box to agree to the terms and conditions.')).toBeTruthy();
  await fireEvent.press(view.getByRole('checkbox', { name: /terms and conditions/ }));
  expect(view.getByText('Tick the box to agree to the privacy policy.')).toBeTruthy();
  await fireEvent.press(view.getByRole('checkbox', { name: /privacy policy/ }));

  await fireEvent.press(view.getByText('Create account'));
  expect(mockRegister).toHaveBeenCalledWith(
    expect.objectContaining({ role: 'PATIENT', email: 'asha@example.com', acceptedTermsVersion: LEGAL_VERSION })
  );
});

it('a specialist must also confirm their registration details are true', async () => {
  const view = await render(wrap(<Register />));
  await fireEvent.press(view.getByText('I am a specialist'));
  await fillPatient(view);
  await fireEvent.changeText(view.getByLabelText('Specialty'), 'Neurology');
  await fireEvent.changeText(view.getByLabelText('Unique ID / registration ID'), 'MC-12345');
  await fireEvent.press(view.getByRole('checkbox', { name: /terms and conditions/ }));
  await fireEvent.press(view.getByRole('checkbox', { name: /privacy policy/ }));

  expect(view.getByText('Tick the box to confirm your registration details are true.')).toBeTruthy();
  await fireEvent.press(view.getByText('Create account'));
  expect(mockRegister).not.toHaveBeenCalled();

  await fireEvent.press(view.getByRole('checkbox', { name: /registered medical practitioner/ }));
  await fireEvent.press(view.getByText('Create account'));
  expect(mockRegister).toHaveBeenCalledWith(expect.objectContaining({ role: 'DOCTOR', licenseNumber: 'MC-12345' }));
});

it('the links open the full texts', async () => {
  const view = await render(wrap(<Register />));
  await fireEvent.press(view.getByText('terms and conditions'));
  expect(mockPush).toHaveBeenCalledWith('/terms');
  await fireEvent.press(view.getByText('privacy policy'));
  expect(mockPush).toHaveBeenCalledWith('/privacy');
});

it('both texts exist and say the app is not a diagnosis', () => {
  expect(TERMS.length).toBeGreaterThan(3);
  expect(PRIVACY.length).toBeGreaterThan(3);
  expect(TERMS[0]!.body.join(' ')).toMatch(/not a medical device/);
});
