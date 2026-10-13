import type { ReactNode } from 'react';

import { PRIVACY, TERMS, type Section } from '@/legal/content';
import { PRIVACY_HI, PRIVACY_PA, TERMS_HI, TERMS_PA } from '@/legal/content.i18n';
import { EXACT_HI, EXACT_PA, TEMPLATES_HI, TEMPLATES_PA } from './catalog.data';

/**
 * Translating what is on screen, by its exact English.
 *
 * The app's words live where they are used (game data, screens). Rather than
 * thread a key through every file, the components that draw text — Text,
 * Button labels, field labels and placeholders — look the English up here. Data
 * and logic stay English: Daily Order still matches a step's picture by its
 * English words, scoring still compares English, only what is drawn changes.
 *
 * Lines with numbers or names in them are patterns ("Level {0} of {1}"); the
 * filled-in values are looked up too, so "Who looks {0}?" with "worried"
 * becomes "कौन चिंतित दिख रहा है?". Anything not in the catalogue stays English
 * rather than guessing. Tables: scripts/i18n-tables, built by i18n-build.py.
 */

export type Translated = 'hi' | 'pa';

type Compiled = { re: RegExp; out: string };

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function compile(templates: [string, string][]): Compiled[] {
  return (
    templates
      // The most literal text first, so a specific pattern beats a loose one.
      .sort((a, b) => b[0].replace(/\{\d\}/g, '').length - a[0].replace(/\{\d\}/g, '').length)
      .map(([en, out]) => ({
        re: new RegExp('^' + escape(en).replace(/\\\{(\d)\\\}/g, '(.+?)') + '$'),
        out,
      }))
  );
}

function zipSections(en: Section[], tr: Section[], into: Record<string, string>) {
  en.forEach((s, i) => {
    const t = tr[i];
    if (!t) return;
    into[s.heading] = t.heading;
    s.body.forEach((p, j) => {
      if (t.body[j]) into[p] = t.body[j];
    });
  });
}

const EXACT: Record<Translated, Record<string, string>> = { hi: { ...EXACT_HI }, pa: { ...EXACT_PA } };
zipSections(TERMS, TERMS_HI, EXACT.hi);
zipSections(PRIVACY, PRIVACY_HI, EXACT.hi);
zipSections(TERMS, TERMS_PA, EXACT.pa);
zipSections(PRIVACY, PRIVACY_PA, EXACT.pa);

const PATTERNS: Record<Translated, Compiled[]> = { hi: compile(TEMPLATES_HI), pa: compile(TEMPLATES_PA) };

const cache: Record<Translated, Map<string, string>> = { hi: new Map(), pa: new Map() };
const CACHE_MAX = 3000;

function lookup(lang: Translated, core: string, depth: number): string {
  const hit = EXACT[lang][core];
  if (hit !== undefined) return hit;
  if (depth > 2 || !/[A-Za-z]/.test(core)) return core;
  for (const p of PATTERNS[lang]) {
    const m = p.re.exec(core);
    if (m) return p.out.replace(/\{(\d)\}/g, (_, i: string) => translateString(lang, m[Number(i) + 1] ?? '', depth + 1));
  }
  return core;
}

/** One string. Leading and trailing spaces are kept as they were. */
export function translateString(lang: string, s: string, depth = 0): string {
  if ((lang !== 'hi' && lang !== 'pa') || !s) return s;
  const core = s.trim();
  if (!core) return s;
  const c = cache[lang];
  let out = depth === 0 ? c.get(core) : undefined;
  if (out === undefined) {
    out = lookup(lang, core, depth);
    if (depth === 0) {
      if (c.size > CACHE_MAX) c.clear();
      c.set(core, out);
    }
  }
  if (out === core) return s;
  const lead = s.slice(0, s.length - s.trimStart().length);
  const trail = s.slice(s.trimEnd().length);
  return lead + out + trail;
}

/** A Text's children: strings translated, anything else left alone. */
export function translateChildren(lang: string, children: ReactNode): ReactNode {
  if (lang !== 'hi' && lang !== 'pa') return children;
  if (typeof children === 'string') return translateString(lang, children);
  if (Array.isArray(children)) {
    // Adjacent strings and numbers are one sentence on screen ("Level ", 3, " of 8").
    const allText = children.every((c) => typeof c === 'string' || typeof c === 'number');
    if (allText && children.length > 1) return translateString(lang, children.join(''));
    return children.map((c) => (typeof c === 'string' ? translateString(lang, c) : c));
  }
  return children;
}

/** For the tests: every catalogue entry in both languages. */
export const catalogFor = (lang: Translated) => EXACT[lang];
