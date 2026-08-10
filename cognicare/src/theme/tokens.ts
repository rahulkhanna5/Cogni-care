/**
 * Design tokens.
 *
 * Every colour pair used for text or on a filled control has been checked at
 * >= 7:1 (WCAG AAA). That is deliberate: the target users are older adults with
 * age-related contrast sensitivity loss, so the usual 4.5:1 floor is not enough.
 * If you change a colour here, re-run the contrast check before committing.
 */

export const colors = {
  bg: '#FAFAF8',
  surface: '#FFFFFF',

  text: '#1F2933', // 14.1:1 on bg
  textMuted: '#4A5760', // 7.1:1 on bg
  textInverse: '#FFFFFF',

  accent: '#246257', // white on accent = 7.1:1
  accentSoft: '#E6F0ED',

  success: '#2A634E',
  warning: '#814C25',
  danger: '#A23024',

  border: '#E2E5E1',
  disabled: '#9AA5A0',
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
 * Only 400 and 600 weights exist on purpose; thin weights lose legibility first.
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
