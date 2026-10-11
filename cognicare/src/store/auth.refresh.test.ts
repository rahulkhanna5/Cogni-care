import { ApiError } from '@/api/client';

const mockRefresh = jest.fn();
jest.mock('@/api/auth.api', () => ({
  refresh: (...a: unknown[]) => mockRefresh(...a),
  login: jest.fn(),
  logout: jest.fn(),
  me: jest.fn(),
}));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

import { useAuth } from './auth';

beforeEach(() => {
  mockRefresh.mockReset();
  useAuth.setState({ accessToken: 'old', refreshToken: 'r1' });
});

it('calls that expire together share one refresh instead of each rotating the token', async () => {
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  mockRefresh.mockImplementation(async () => {
    await gate;
    return { accessToken: 'new', refreshToken: 'r2' };
  });

  const call = jest.fn(async (token: string) => {
    if (token === 'old') throw new ApiError(401, 'TOKEN_EXPIRED', 'expired');
    return `ok:${token}`;
  });

  const all = Promise.all([1, 2, 3, 4].map(() => useAuth.getState().authedFetch(call)));
  await new Promise((r) => setTimeout(r, 0));
  release();

  expect(await all).toEqual(['ok:new', 'ok:new', 'ok:new', 'ok:new']);
  expect(mockRefresh).toHaveBeenCalledTimes(1);
  expect(useAuth.getState().refreshToken).toBe('r2');
});

it('a later expiry refreshes again — the shared refresh does not stick', async () => {
  mockRefresh.mockResolvedValueOnce({ accessToken: 'n1', refreshToken: 'r2' });
  mockRefresh.mockResolvedValueOnce({ accessToken: 'n2', refreshToken: 'r3' });
  const expireOnce = (bad: string) =>
    jest.fn(async (t: string) => {
      if (t === bad) throw new ApiError(401, 'TOKEN_EXPIRED', 'expired');
      return t;
    });

  expect(await useAuth.getState().authedFetch(expireOnce('old'))).toBe('n1');
  expect(await useAuth.getState().authedFetch(expireOnce('n1'))).toBe('n2');
  expect(mockRefresh).toHaveBeenCalledTimes(2);
});
