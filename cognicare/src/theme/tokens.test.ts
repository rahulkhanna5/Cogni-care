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

  it('white on the blue fill (primary buttons)', () => {
    expect(contrastRatio(colors.textInverse, colors.accent)).toBeGreaterThanOrEqual(7);
  });

  it('dark ink on the light illustration tile', () => {
    expect(contrastRatio(colors.ink, colors.tile)).toBeGreaterThanOrEqual(7);
  });

  // Over a picture the word sits inside the tile (Sprite `framed`), because a
  // caption on the picture itself has no fixed background to measure against.
  it('item names inside a framed tile', () => {
    expect(contrastRatio(colors.ink, colors.tile)).toBeGreaterThanOrEqual(7);
  });

  it('main text on the stronger blue tint (avatars, the tab pill)', () => {
    expect(contrastRatio(colors.text, colors.tint)).toBeGreaterThanOrEqual(7);
    expect(contrastRatio(colors.accentOnCard, colors.tint)).toBeGreaterThanOrEqual(7);
  });
});

describe('the owner\'s colours, exactly, as shapes (3:1)', () => {
  const MARKS = ['accentBright', 'teal', 'success', 'warning', 'danger'] as const;
  for (const mark of MARKS) {
    for (const surface of ['bg', 'surface'] as const) {
      it(`${mark} on ${surface}`, () => {
        expect(contrastRatio(colors[mark], surfaceFill[surface])).toBeGreaterThanOrEqual(3);
      });
    }
  }

  it('a tick on the green fill, and a mistake mark on its soft red', () => {
    expect(contrastRatio(colors.ink, colors.success)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(colors.danger, colors.dangerSoft)).toBeGreaterThanOrEqual(3);
  });

  it('white icons on the blue fill (lit cell, walker)', () => {
    expect(contrastRatio(colors.textInverse, colors.accent)).toBeGreaterThanOrEqual(7);
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
  it('the owner\'s blue is not enough for text or a white label', () => {
    // 5.2:1 — which is why accent is the darker shade.
    expect(contrastRatio(colors.accentBright, colors.surface)).toBeLessThan(7);
    expect(contrastRatio(colors.textInverse, colors.accentBright)).toBeLessThan(7);
  });

  it('green and amber are far short as text', () => {
    expect(contrastRatio(colors.success, colors.surface)).toBeLessThan(4.5);
    expect(contrastRatio(colors.warning, colors.surface)).toBeLessThan(4.5);
  });

  it('blue text on the selection tint falls short, so it uses the deeper blue', () => {
    expect(contrastRatio(colors.accent, colors.selected)).toBeLessThan(7);
    expect(textColorOn('accent', 'selected')).toBe(colors.accentOnCard);
  });

  it('coloured text on a soft status tint yields to main text', () => {
    expect(contrastRatio(colors.successText, colors.successSoft)).toBeLessThan(7);
    expect(textColorOn('success', 'successSoft')).toBe(colors.text);
    expect(textColorOn('textMuted', 'dangerSoft')).toBe(colors.text);
  });

  it('the divider is too faint to be an input edge', () => {
    expect(contrastRatio(colors.divider, colors.bg)).toBeLessThan(3);
  });
});
