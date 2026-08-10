/**
 * Design tokens — dark theme.
 *
 * Brand colours supplied by the owner: background #1F1D1E, primary #FF968C,
 * secondary #332F29.
 *
 * Everything that carries text or sits on a filled control is held at >= 7:1
 * (WCAG AAA), because the target users are older adults with age-related
 * contrast sensitivity loss and the usual 4.5:1 floor is not enough for them.
 * The supplied brand pair happens to land well: primary on background is
 * 7.98:1, and background ink on primary is also 7.98:1, so buttons work in
 * both directions. Re-check with a contrast script before changing any value.
 */

export const colors = {
  bg: '#1F1D1E',
  /** Brand secondary — cards and raised blocks. */
  surface: '#332F29',
  surfaceRaised: '#3D3830',

  text: '#EDE6E3', // 13.6:1 on bg
  textMuted: '#C4BAB5', // 8.8:1 on bg
  /** Ink for text sitting ON the primary colour. */
  textInverse: '#1F1D1E', // 8.0:1 on accent

  accent: '#FF968C', // 8.0:1 on bg
  /** Dim tint for filled backgrounds behind accent text. */
  accentSoft: '#43302E',

  success: '#8FD9B6', // 10.2:1 on bg
  warning: '#F0C08A', // 10.1:1 on bg
  danger: '#FF9B94', // 8.3:1 on bg
  /** Dim tint for an error flash, the dark counterpart to a pale pink wash. */
  dangerSoft: '#3A2523',

  border: '#474139',
  disabled: '#6B635C',
} as const;

/** 8pt scale. Generous by design — dense layouts are hard to target accurately. */
export const space = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

/**
 * Body starts at 20 — the usual 14–16 is unreadable for much of this audience.
 * Only 400 and 600 weights exist on purpose; thin weights lose legibility
 * first, and they lose it faster on a dark background than a light one.
 */
export const type = {
  display: { fontSize: 34, lineHeight: 42, fontWeight: '600' },
  title: { fontSize: 28, lineHeight: 36, fontWeight: '600' },
  heading: { fontSize: 22, lineHeight: 30, fontWeight: '600' },
  body: { fontSize: 20, lineHeight: 30, fontWeight: '400' },
  label: { fontSize: 18, lineHeight: 26, fontWeight: '600' },
  caption: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
} as const;

export const radius = { sm: 8, md: 16, lg: 24, pill: 999 } as const;

/**
 * 56 rather than the conventional 44. Tremor and reduced fine motor control
 * make small targets a real failure point for this group.
 */
export const TOUCH_MIN = 56;

export type TypeVariant = keyof typeof type;
