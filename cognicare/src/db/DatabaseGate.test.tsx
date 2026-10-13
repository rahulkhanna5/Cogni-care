import { fireEvent, render } from '@testing-library/react-native';
import { Platform, Text } from 'react-native';

import { DatabaseGate, isLocked } from './DatabaseGate';

function Boom({ message }: { message: string }): never {
  throw new Error(message);
}

beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

it('recognises the second-tab lock on the web only', () => {
  const lock = new Error("NoModificationAllowedError: Failed to execute 'createSyncAccessHandle'");
  const os = Platform.OS;
  Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
  expect(isLocked(lock)).toBe(true);
  expect(isLocked(new Error('disk full'))).toBe(false);
  Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
});

it('shows a plain message with Try again instead of crashing, and retries', async () => {
  Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
  let fail = true;
  const view = await render(
    <DatabaseGate>
      {(attempt) => (fail ? <Boom message="disk full" /> : <Text>{`opened on attempt ${attempt}`}</Text>)}
    </DatabaseGate>
  );
  expect(view.getByText('Could not open your saved data')).toBeTruthy();
  fail = false;
  await fireEvent.press(view.getByText('Try again'));
  expect(view.getByText('opened on attempt 1')).toBeTruthy();
});
