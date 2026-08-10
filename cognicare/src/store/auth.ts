import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

import * as api from '@/api/auth.api';
import { ApiError } from '@/api/client';

const ACCESS_KEY = 'cognicare.accessToken';
const REFRESH_KEY = 'cognicare.refreshToken';

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
  if (accessToken) await SecureStore.setItemAsync(ACCESS_KEY, accessToken);
  else await SecureStore.deleteItemAsync(ACCESS_KEY);

  if (refreshToken) await SecureStore.setItemAsync(REFRESH_KEY, refreshToken);
  else await SecureStore.deleteItemAsync(REFRESH_KEY);
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  pendingApproval: false,
  hydrated: false,

  hydrate: async () => {
    try {
      const [accessToken, refreshToken] = await Promise.all([
        SecureStore.getItemAsync(ACCESS_KEY),
        SecureStore.getItemAsync(REFRESH_KEY),
      ]);

      if (!accessToken || !refreshToken) {
        set({ hydrated: true });
        return;
      }

      try {
        const { user, pendingApproval } = await api.me(accessToken);
        set({ user, accessToken, refreshToken, pendingApproval, hydrated: true });
      } catch {
        // Stored token is stale — try the refresh before giving up, so a user
        // who opens the app after a week is not signed out needlessly.
        try {
          const rotated = await api.refresh(refreshToken);
          const { user, pendingApproval } = await api.me(rotated.accessToken);
          await persist(rotated.accessToken, rotated.refreshToken);
          set({
            user,
            accessToken: rotated.accessToken,
            refreshToken: rotated.refreshToken,
            pendingApproval,
            hydrated: true,
          });
        } catch {
          await persist(null, null);
          set({ user: null, accessToken: null, refreshToken: null, hydrated: true });
        }
      }
    } catch {
      set({ hydrated: true });
    }
  },

  signIn: async (email, password) => {
    const result = await api.login(email, password);
    await persist(result.accessToken, result.refreshToken);
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

      const rotated = await api.refresh(refreshToken!);
      await persist(rotated.accessToken, rotated.refreshToken);
      set({ accessToken: rotated.accessToken, refreshToken: rotated.refreshToken });
      return fn(rotated.accessToken);
    }
  },
}));
