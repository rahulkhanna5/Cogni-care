import { contrastRatio, surfaceFill, textColorOn, type Surface, type TextColor } from './contrast';
import { colors } from './tokens';

/**
 * The palette is measured, not chosen. These tests are the measurement: change
 * a colour and they tell you, before a user with contrast-sensitivity loss does.
 */

const SURFACES = Object.keys(surfaceFill) as Surface[];
const TEXT: TextColor[] = ['text', 'textMuted', 'accent', 'success', 'warning', 'danger'];

describe('text contrast (WCAG AAA, 7:1)', () => {
  for (const color of TEXT) {
    for (const surface of SURFACES) {
      it(`${color} on ${surface}`, () => {
        const ratio = contrastRatio(textColorOn(color, surface), surfaceFill[surface]);
        expect(ratio).toBeGreaterThanOrEqual(7);
      });
    }
  }

  it('dark ink on the coral fill (primary buttons)', () => {
    expect(contrastRatio(colors.textInverse, colors.accent)).toBeGreaterThanOrEqual(7);
  });

  it('dark ink on the green fill (correct answers)', () => {
    expect(contrastRatio(colors.textInverse, colors.success)).toBeGreaterThanOrEqual(7);
  });

  it('dark ink on the light illustration tile', () => {
    expect(contrastRatio(colors.ink, colors.tile)).toBeGreaterThanOrEqual(7);
  });

  // Over a picture the word sits inside the tile (Sprite `framed`), because a
  // caption on the picture itself has no fixed background to measure against.
  it('item names inside a framed tile', () => {
    expect(contrastRatio(colors.textInverse, colors.tile)).toBeGreaterThanOrEqual(7);
  });
});

describe('edges of things you can tap or type into (3:1)', () => {
  const EDGED: Surface[] = ['bg', 'surface', 'raised', 'field', 'selected'];
  for (const surface of EDGED) {
    it(`edge on ${surface}`, () => {
      expect(contrastRatio(colors.edge, surfaceFill[surface])).toBeGreaterThanOrEqual(3);
    });
  }
});

describe('the traps this palette exists to avoid', () => {
  it('plain coral is not used as text on a card', () => {
    // 6.3:1 — which is why accentOnCard exists.
    expect(contrastRatio(colors.accent, colors.surface)).toBeLessThan(7);
    expect(textColorOn('accent', 'surface')).toBe(colors.accentOnCard);
  });

  it('the divider is too faint to be an input edge', () => {
    expect(contrastRatio(colors.divider, colors.bg)).toBeLessThan(3);
  });
});
