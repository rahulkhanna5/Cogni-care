import { create } from 'zustand';

export type Lang = 'en' | 'hi' | 'pa';

/**
 * The chosen language, kept apart from i18n/index.ts so the core Text
 * component can read it without importing the database layer.
 */
export const useLanguage = create<{ lang: Lang; set: (l: Lang) => void }>((set) => ({
  lang: 'en',
  set: (lang) => set({ lang }),
}));
