import { colors } from './tokens';

/** WCAG 2.x relative luminance of a #RRGGBB colour. */
export function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) =>
    c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/* ------------------------------- surfaces -------------------------------- */

/** Every background text can sit on. Components announce theirs via context. */
export type Surface =
  | 'bg'
  | 'surface'
  | 'raised'
  | 'field'
  | 'tabBar'
  | 'selected'
  | 'dangerSoft'
  | 'successSoft'
  | 'warningSoft';

export const surfaceFill: Record<Surface, string> = {
  bg: colors.bg,
  surface: colors.surface,
  raised: colors.surfaceRaised,
  field: colors.field,
  tabBar: colors.tabBar,
  selected: colors.selected,
  dangerSoft: colors.dangerSoft,
  successSoft: colors.successSoft,
  warningSoft: colors.warningSoft,
};

export type TextColor =
  | 'text'
  | 'textMuted'
  | 'textInverse'
  | 'ink'
  | 'accent'
  | 'success'
  | 'warning'
  | 'danger';

/** Surfaces where every coloured shade of text clears 7:1: the page and white. */
const PLAIN: Surface[] = ['bg', 'surface', 'field', 'tabBar'];
/** Soft status tints, where only main text clears 7:1. */
const SOFT: Surface[] = ['dangerSoft', 'successSoft', 'warningSoft'];

/**
 * The colour a piece of text should actually be drawn in, given what it sits on.
 *
 * Callers ask for intent ("accent") and this picks the shade that clears 7:1
 * on that surface, so a blue label moved from the page onto a tinted card
 * cannot silently fall short. textInverse and ink are for text on blue fills
 * and light-tile fills, which are not surfaces in this sense; they pass through.
 */
export function textColorOn(color: TextColor, surface: Surface): string {
  switch (color) {
    case 'accent':
      if (PLAIN.includes(surface)) return colors.accent;
      // On a soft status tint nothing blue reaches 7:1 without going near-black.
      return SOFT.includes(surface) ? colors.text : colors.accentOnCard;
    case 'success':
    case 'warning':
    case 'danger':
      // Each shade is 7.0-7.4:1 on the page and white, but 6.0-6.9 on a tint.
      // There, the message is carried by main text, with the colour in the
      // icon and edge beside it.
      if (!PLAIN.includes(surface)) return colors.text;
      return { success: colors.successText, warning: colors.warningText, danger: colors.dangerText }[color];
    case 'textMuted':
      // Slate is 6.2-6.96:1 on a selection or status tint.
      return SOFT.includes(surface) || surface === 'selected' ? colors.text : colors.textMuted;
    default:
      return colors[color];
  }
}
