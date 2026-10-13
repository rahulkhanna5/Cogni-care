import { ApiError } from '@/api/client';

const mockMe = jest.fn();
const mockRefresh = jest.fn();
jest.mock('@/api/auth.api', () => ({
  me: (...a: unknown[]) => mockMe(...a),
  refresh: (...a: unknown[]) => mockRefresh(...a),
  login: jest.fn(),
  logout: jest.fn(),
}));

const mockStore = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (k: string) => mockStore.get(k) ?? null),
  setItemAsync: jest.fn(async (k: string, v: string) => void mockStore.set(k, v)),
  deleteItemAsync: jest.fn(async (k: string) => void mockStore.delete(k)),
}));

import { useAuth } from './auth';

const asha = { id: 'u1', name: 'Asha', email: 'a@x.com', role: 'PATIENT' };

beforeEach(() => {
  mockStore.clear();
  mockMe.mockReset();
  mockRefresh.mockReset();
  useAuth.setState({ user: null, accessToken: null, refreshToken: null, hydrated: false });
});

const signedInBefore = () => {
  mockStore.set('cognicare.accessToken', 'a1');
  mockStore.set('cognicare.refreshToken', 'r1');
  mockStore.set('cognicare.profile', JSON.stringify({ user: asha, pendingApproval: false }));
};

it('opens at once as the remembered person, even if the server never answers', async () => {
  signedInBefore();
  mockMe.mockReturnValue(new Promise(() => undefined)); // asleep host
  await useAuth.getState().hydrate();
  expect(useAuth.getState()).toMatchObject({ hydrated: true, user: { id: 'u1' }, accessToken: 'a1' });
});

it('stays signed in when the server is unreachable', async () => {
  signedInBefore();
  mockMe.mockRejectedValue(new ApiError(0, 'NETWORK_ERROR', 'offline'));
  await useAuth.getState().hydrate();
  await new Promise((r) => setTimeout(r, 0));
  expect(useAuth.getState().user).toMatchObject({ id: 'u1' });
  expect(mockRefresh).not.toHaveBeenCalled();
});

it('signs out in the background when the server rejects the session', async () => {
  signedInBefore();
  mockMe.mockRejectedValue(new ApiError(401, 'TOKEN_EXPIRED', 'expired'));
  mockRefresh.mockRejectedValue(new ApiError(401, 'INVALID_REFRESH', 'revoked'));
  await useAuth.getState().hydrate();
  expect(useAuth.getState().user).toMatchObject({ id: 'u1' }); // opened first
  await new Promise((r) => setTimeout(r, 0));
  expect(useAuth.getState().user).toBeNull();
  expect(mockStore.has('cognicare.refreshToken')).toBe(false);
  expect(mockStore.has('cognicare.profile')).toBe(false);
});
