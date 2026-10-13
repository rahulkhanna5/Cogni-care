import { useSQLiteContext } from 'expo-sqlite';
import { useEffect } from 'react';
import { create } from 'zustand';

import { getSetting, setSetting } from '@/db/queries';
import { EN, HI, type Key } from './strings';

export type Lang = 'en' | 'hi';
export const LANGUAGES: { value: Lang; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'हिन्दी' },
];

const TABLES: Record<Lang, Record<Key, string>> = { en: EN, hi: HI };

export const useLanguage = create<{ lang: Lang; set: (l: Lang) => void }>((set) => ({
  lang: 'en',
  set: (lang) => set({ lang }),
}));

/** Pure lookup, with {placeholders} filled in. Falls back to English. */
export function translate(lang: Lang, key: Key, vars?: Record<string, string | number>): string {
  let s = TABLES[lang][key] ?? EN[key];
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
  return s;
}

/** `const t = useT(); t('dash.hello')` — re-renders when the language changes. */
export function useT() {
  const lang = useLanguage((s) => s.lang);
  return (key: Key, vars?: Record<string, string | number>) => translate(lang, key, vars);
}

const SETTING = 'language';

/** Reads the saved language once the database is open. Renders nothing. */
export function LanguageLoader() {
  const db = useSQLiteContext();
  useEffect(() => {
    getSetting(db, SETTING)
      .then((v) => {
        if (v === 'en' || v === 'hi') useLanguage.getState().set(v);
      })
      .catch(() => undefined);
  }, [db]);
  return null;
}

/** Changes the language now and remembers it on this phone. */
export function useSetLanguage() {
  const db = useSQLiteContext();
  return async (lang: Lang) => {
    useLanguage.getState().set(lang);
    await setSetting(db, SETTING, lang);
  };
}
