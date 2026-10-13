import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect } from 'react';
import { create } from 'zustand';

import { getSetting, setSetting } from '@/db/queries';
import { applyTheme, type ThemeMode } from './tokens';

/** The chosen theme. Changing it rewrites the palette and re-draws the app. */
export const useThemeMode = create<{ mode: ThemeMode; set: (m: ThemeMode) => void }>((set) => ({
  mode: 'light',
  set: (mode) => {
    applyTheme(mode);
    set({ mode });
  },
}));

const SETTING = 'theme';

/** Reads the saved theme once the database is open. Renders nothing. */
export function ThemeLoader() {
  const db = useSQLiteContext();
  useEffect(() => {
    getSetting(db, SETTING)
      .then((v) => {
        if (v === 'light' || v === 'dark') useThemeMode.getState().set(v);
      })
      .catch(() => undefined);
  }, [db]);
  return null;
}

/**
 * Switch theme now, remember it, and rebuild the screens.
 *
 * The React Compiler memoises each screen's styles, and a style read from the
 * palette object has no dependency it can see — so a screen that merely
 * re-renders keeps its old colours (a `key` on a provider did not remount
 * expo-router's screens either). Going back through the start screen mounts
 * every screen afresh, and the start screen routes straight back home.
 */
export function useSetThemeMode() {
  const db = useSQLiteContext();
  const router = useRouter();
  return async (mode: ThemeMode) => {
    if (mode === useThemeMode.getState().mode) return;
    useThemeMode.getState().set(mode);
    await setSetting(db, SETTING, mode).catch(() => undefined);
    router.replace('/');
  };
}
