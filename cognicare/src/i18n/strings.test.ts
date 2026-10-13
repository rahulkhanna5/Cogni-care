import { translate } from './index';
import { EN, HI } from './strings';

jest.mock('expo-sqlite', () => ({ useSQLiteContext: jest.fn() }));

it('every English string has a Hindi one, and no Hindi one is left empty', () => {
  expect(Object.keys(HI).sort()).toEqual(Object.keys(EN).sort());
  for (const v of Object.values(HI)) expect(v.trim().length).toBeGreaterThan(0);
});

it('placeholders survive translation', () => {
  for (const [k, v] of Object.entries(EN)) {
    const holes = v.match(/\{\w+\}/g) ?? [];
    for (const h of holes) expect(HI[k as keyof typeof EN]).toContain(h);
  }
  expect(translate('hi', 'dash.helloName', { name: 'Asha' })).toBe('नमस्ते, Asha');
  expect(translate('en', 'dash.avg', { pct: 80 })).toBe('80% right on average');
});
