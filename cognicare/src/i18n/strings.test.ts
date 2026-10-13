import { translate } from './index';
import { EN, HI, PA } from './strings';

jest.mock('expo-sqlite', () => ({ useSQLiteContext: jest.fn() }));

it('every English string has a Hindi and a Punjabi one, none left empty', () => {
  for (const table of [HI, PA]) {
    expect(Object.keys(table).sort()).toEqual(Object.keys(EN).sort());
    for (const v of Object.values(table)) expect(v.trim().length).toBeGreaterThan(0);
  }
});

it('placeholders survive translation', () => {
  for (const [k, v] of Object.entries(EN)) {
    const holes = v.match(/\{\w+\}/g) ?? [];
    for (const h of holes) {
      expect(HI[k as keyof typeof EN]).toContain(h);
      expect(PA[k as keyof typeof EN]).toContain(h);
    }
  }
  expect(translate('hi', 'dash.helloName', { name: 'Asha' })).toBe('नमस्ते, Asha');
  expect(translate('en', 'dash.avg', { pct: 80 })).toBe('80% right on average');
});
