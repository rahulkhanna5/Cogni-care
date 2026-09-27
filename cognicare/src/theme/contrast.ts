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

/**
 * The colour a piece of text should actually be drawn in, given what it sits on.
 *
 * Callers ask for intent ("accent") and this picks the shade that clears 7:1
 * on that surface, so a coral label moved from the page onto a card cannot
 * silently fall to 6.3:1. textInverse and ink are for text on coral, green and
 * light-tile fills, which are not surfaces in this sense; they pass through.
 */
export function textColorOn(color: TextColor, surface: Surface): string {
  switch (color) {
    case 'accent':
      // Plain coral clears 7:1 only on the darkest surfaces.
      return surface === 'bg' || surface === 'field' || surface === 'tabBar'
        ? colors.accent
        : colors.accentOnCard;
    case 'danger':
      // The ring colour is 6.6:1 on a card. Text always uses the lighter shade.
      return colors.dangerText;
    case 'warning':
      // Sand is 6.98:1 on raised — a hair short — so it yields to plain text there.
      return surface === 'raised' ? colors.text : colors.warning;
    default:
      return colors[color];
  }
}
