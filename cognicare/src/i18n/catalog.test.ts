import { PRIVACY, TERMS } from '@/legal/content';
import { PRIVACY_HI, PRIVACY_PA, TERMS_HI, TERMS_PA } from '@/legal/content.i18n';
import { catalogFor, translateChildren, translateString } from './catalog';
import { EXACT_HI, EXACT_PA, TEMPLATES_HI, TEMPLATES_PA } from './catalog.data';
import { QUESTIONS, CHOICES } from '@/assessment/questions';
import { TASKS } from '@/games/daily-order/tasks';
import { GAMES } from '@/games/registry';

it('English passes through untouched', () => {
  expect(translateString('en', 'Start check-in')).toBe('Start check-in');
});

it('translates an exact line, keeping the spaces around it', () => {
  expect(translateString('hi', 'Start check-in')).toBe('जाँच शुरू करें');
  expect(translateString('pa', '  Sign in ')).toBe('  ਸਾਈਨ ਇਨ ');
});

it('fills a pattern and translates the words put into it', () => {
  expect(translateString('hi', 'Level 3 of 8')).toBe('स्तर 3 / 8');
  expect(translateString('hi', 'Who looks worried?')).toBe('कौन चिंतित दिख रहा है?');
  expect(translateString('pa', 'Listen for the dog')).toBe('ਕੁੱਤਾ ਦੀ ਆਵਾਜ਼ ਪਛਾਣੋ');
  expect(translateString('hi', 'Walk 1 of 3 · Walk to the clinic')).toBe('सैर 1 / 3 · क्लिनिक तक चलें');
});

it('leaves what it does not know in English rather than guessing', () => {
  expect(translateString('hi', 'Asha Rao')).toBe('Asha Rao');
  expect(translateString('hi', '42')).toBe('42');
});

it('joins a sentence split across pieces before translating it', () => {
  expect(translateChildren('hi', ['3 sessions', ' · last played 13 Oct 2026'])).toBe('3 सत्र · आख़िरी बार 13 Oct 2026');
});

it('both languages cover the same lines and patterns, none left empty', () => {
  expect(Object.keys(EXACT_PA).sort()).toEqual(Object.keys(EXACT_HI).sort());
  expect(TEMPLATES_PA.map((t) => t[0])).toEqual(TEMPLATES_HI.map((t) => t[0]));
  for (const v of [...Object.values(EXACT_HI), ...Object.values(EXACT_PA)]) expect(v.trim()).not.toBe('');
});

it('patterns keep every placeholder', () => {
  for (const [en, tr] of [...TEMPLATES_HI, ...TEMPLATES_PA]) {
    for (const h of en.match(/\{\d\}/g) ?? []) expect(tr).toContain(h);
  }
});

it('the legal texts have the same shape in every language', () => {
  for (const [en, tr] of [
    [TERMS, TERMS_HI],
    [TERMS, TERMS_PA],
    [PRIVACY, PRIVACY_HI],
    [PRIVACY, PRIVACY_PA],
  ] as const) {
    expect(tr.map((s) => s.body.length)).toEqual(en.map((s) => s.body.length));
  }
});

// The content a patient spends most time with must never fall back to English.
it('every check-in question and answer, game title and Daily Order step is translated', () => {
  const lines = [
    ...QUESTIONS.map((q) => q.text),
    ...CHOICES.map((c) => c.label),
    ...GAMES.flatMap((g) => [g.title, g.blurb]),
    ...TASKS.flatMap((t) => [t.title, ...t.steps, ...t.distractors]),
  ];
  for (const lang of ['hi', 'pa'] as const) {
    const missing = lines.filter((l) => !(l in catalogFor(lang)));
    expect(missing).toEqual([]);
  }
});
