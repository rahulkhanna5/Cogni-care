import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { create } from 'zustand';

import * as api from '@/api/auth.api';
import { ApiError } from '@/api/client';

const ACCESS_KEY = 'cognicare.accessToken';
const REFRESH_KEY = 'cognicare.refreshToken';

/**
 * expo-secure-store is native-only — on web every call throws, which made
 * signing in fail after a successful login response, with no error in the
 * console to explain it.
 *
 * The web path uses localStorage, which is NOT secure storage: it is readable
 * by any script on the origin. That is acceptable only because the web build
 * exists to preview the UI in a browser. Ship a real web client and this
 * needs httpOnly cookies instead.
 */
const store = {
  get: (key: string) =>
    Platform.OS === 'web'
      ? Promise.resolve(globalThis.localStorage?.getItem(key) ?? null)
      : SecureStore.getItemAsync(key),
  set: (key: string, value: string) =>
    Platform.OS === 'web'
      ? Promise.resolve(globalThis.localStorage?.setItem(key, value))
      : SecureStore.setItemAsync(key, value),
  remove: (key: string) =>
    Platform.OS === 'web'
      ? Promise.resolve(globalThis.localStorage?.removeItem(key))
      : SecureStore.deleteItemAsync(key),
};

/** Who was signed in, kept beside the tokens so the app can open offline. */
const PROFILE_KEY = 'cognicare.profile';
type CachedProfile = { user: api.ApiUser; pendingApproval: boolean };
const parseProfile = (raw: string | null): CachedProfile | null => {
  try {
    const p = raw ? (JSON.parse(raw) as CachedProfile) : null;
    return p && p.user && typeof p.user.id === 'string' ? p : null;
  } catch {
    return null;
  }
};
const rememberProfile = (p: CachedProfile | null) =>
  (p ? store.set(PROFILE_KEY, JSON.stringify(p)) : store.remove(PROFILE_KEY)).catch(() => undefined);

/** Longest the first launch after an update waits for the server. */
const FIRST_CHECK_MS = 4000;

/** The refresh in flight, if any — see authedFetch. */
let refreshing: Promise<{ accessToken: string; refreshToken: string }> | null = null;

type AuthState = {
  user: api.ApiUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  pendingApproval: boolean;
  /** False until the stored session has been read back from the keychain. */
  hydrated: boolean;

  hydrate: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<api.ApiUser>;
  signOut: () => Promise<void>;
  /** Returns a valid access token, refreshing once if the current one expired. */
  authedFetch: <T>(fn: (token: string) => Promise<T>) => Promise<T>;
};

/** Tokens go in the keychain / keystore, never AsyncStorage — that is plain
 *  text on a rooted device. */
async function persist(accessToken: string | null, refreshToken: string | null) {
  if (accessToken) await store.set(ACCESS_KEY, accessToken);
  else await store.remove(ACCESS_KEY);

  if (refreshToken) await store.set(REFRESH_KEY, refreshToken);
  else await store.remove(REFRESH_KEY);
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  pendingApproval: false,
  hydrated: false,

  hydrate: async () => {
    let accessToken: string | null = null;
    let refreshToken: string | null = null;
    let cached: CachedProfile | null = null;
    try {
      [accessToken, refreshToken] = await Promise.all([store.get(ACCESS_KEY), store.get(REFRESH_KEY)]);
      cached = parseProfile(await store.get(PROFILE_KEY));
    } catch {
      // Unreadable storage: start signed out rather than not at all.
    }

    if (!accessToken || !refreshToken) {
      set({ hydrated: true });
      return;
    }

    // Open at once as the person who was signed in. The server is asked in
    // the background: waiting for it first meant a blank spinner for up to
    // 40 s whenever the free host was asleep, and offline it signed people
    // out of an app whose exercises need no network at all.
    if (cached) {
      set({ user: cached.user, accessToken, refreshToken, pendingApproval: cached.pendingApproval, hydrated: true });
      void confirmSession(accessToken, refreshToken);
      return;
    }

    // An install from before the profile was kept: nothing to show yet, so
    // wait for the server, but never longer than a short beat.
    const confirmed = confirmSession(accessToken, refreshToken);
    await Promise.race([confirmed, new Promise((r) => setTimeout(r, FIRST_CHECK_MS))]);
    set({ hydrated: true });
  },

  signIn: async (email, password) => {
    const result = await api.login(email, password);
    await persist(result.accessToken, result.refreshToken);
    await rememberProfile({ user: result.user, pendingApproval: result.pendingApproval });
    set({
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      pendingApproval: result.pendingApproval,
    });
    return result.user;
  },

  signOut: async () => {
    const { refreshToken } = get();
    // Revoke server-side too, so a stolen refresh token dies with the session.
    if (refreshToken) await api.logout(refreshToken).catch(() => undefined);
    await persist(null, null);
    await rememberProfile(null);
    set({ user: null, accessToken: null, refreshToken: null, pendingApproval: false });
  },

  authedFetch: async <T,>(fn: (token: string) => Promise<T>): Promise<T> => {
    const { accessToken, refreshToken } = get();
    if (!accessToken) throw new ApiError(401, 'UNAUTHENTICATED', 'Please sign in.');

    try {
      return await fn(accessToken);
    } catch (error) {
      const expired =
        error instanceof ApiError &&
        (error.code === 'TOKEN_EXPIRED' || error.status === 401) &&
        refreshToken;

      if (!expired) throw error;

      // Refresh tokens rotate, so a second refresh with the same old token is
      // treated as reuse. Calls that expire together share ONE refresh.
      const rotated = await sharedRefresh(refreshToken!);
      return fn(rotated.accessToken);
    }
  },
}));

/**
 * Asks the server who the stored tokens belong to, refreshing once if the
 * access token expired, and brings the app's state in line. Only a server that
 * REJECTS the session signs the person out; an unreachable one changes nothing.
 */
async function confirmSession(accessToken: string, refreshToken: string): Promise<void> {
  const set = useAuth.setState;
  try {
    const { user, pendingApproval } = await api.me(accessToken);
    set({ user, pendingApproval });
    await rememberProfile({ user, pendingApproval });
    return;
  } catch (error) {
    if (error instanceof ApiError && error.status === 0) return; // offline / asleep: keep going
  }
  try {
    const rotated = await sharedRefresh(refreshToken);
    const { user, pendingApproval } = await api.me(rotated.accessToken);
    await rememberProfile({ user, pendingApproval });
    set({ user, pendingApproval });
  } catch (error) {
    if (error instanceof ApiError && error.status === 0) return;
    await persist(null, null);
    await rememberProfile(null);
    set({ user: null, accessToken: null, refreshToken: null, pendingApproval: false });
  }
}

/**
 * The one refresh in flight. Refresh tokens rotate, so a second refresh with
 * the same old token looks like reuse and can end the session: everything that
 * refreshes (authedFetch, the start-up check) shares this promise.
 */
function sharedRefresh(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
  refreshing ??= (async () => {
    try {
      const rotated = await api.refresh(refreshToken);
      await persist(rotated.accessToken, rotated.refreshToken);
      useAuth.setState({ accessToken: rotated.accessToken, refreshToken: rotated.refreshToken });
      return rotated;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}
