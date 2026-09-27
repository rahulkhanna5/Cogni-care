/**
 * Design tokens — "Warm Lantern": a dark, warm room with one soft coral light
 * guiding the way. Dark theme only.
 *
 * Brand colours supplied by the owner: background #1F1D1E, primary #FF968C,
 * secondary #332F29. Everything else was specified in the Claude Design system
 * and every pair below was re-measured before use (see tokens.test.ts, which
 * fails the build if any of these drift).
 *
 * The rule is 7:1 (WCAG AAA) for ALL text, measured against the surface the
 * text actually sits on — not just the page. The previous palette measured
 * only against the page, which hid two failures: coral text on the old coral
 * tint was 5.9:1, and muted text on cards was 6.99:1. Edges of anything you
 * can tap or type into are held to 3:1.
 */

export const colors = {
  /* ------------------------------- surfaces ------------------------------- */
  bg: '#1F1D1E',
  /** Brand secondary — cards and tiles. */
  surface: '#332F29',
  /** Raised blocks inside a card, and the disabled button fill. */
  surfaceRaised: '#3D3830',
  /** Text field fill — darker than the page, so a field reads as a well. */
  field: '#171516',
  tabBar: '#262322',
  /**
   * Behind anything selected or placed. Replaces the old coral tint: light
   * text on this is 10.1:1, where coral text on the old tint was 5.9:1.
   * Always paired with a 3px coral edge and a check, never colour alone.
   */
  selected: '#4A2C29',
  /** Light tile behind every illustration. */
  tile: '#F2E6DA',
  /** Dark ink for features drawn on a light tile or face. 13.3:1 on tile. */
  ink: '#221F20',

  /* --------------------------------- text --------------------------------- */
  text: '#EDE6E3', // 13.6 bg · 10.8 surface · 9.4 raised
  textMuted: '#D2C9C4', // 10.3 bg · 8.2 surface · 7.1 raised
  /** Ink for text on a coral or green fill. 8.0:1 on coral. */
  textInverse: '#1F1D1E',
  /**
   * Placeholder examples only. 4.7:1 on the field — below the 7:1 text rule
   * on purpose: a placeholder as bright as typed text reads as already filled
   * in. Labels always sit above fields, so no instruction lives here.
   */
  placeholder: '#8A8078',

  /* --------------------------------- coral -------------------------------- */
  /** Fills, and text on the page (8.0:1). Only 6.3:1 on a card — never text there. */
  accent: '#FF968C',
  /** Coral text on cards: 8.4 surface · 7.3 raised. */
  accentOnCard: '#FFBDB5',
  /** The glow ring around a lit cell. Graphic only, never text. */
  halo: '#FFC8C1',

  /* --------------------------------- lines -------------------------------- */
  /** Edges of inputs, tiles, chips: 4.3 bg · 3.4 surface · 3.0 raised. */
  edge: '#8A8078',
  /** Decorative lines only (1.7:1). Never an input edge. */
  divider: '#474139',

  /* -------------------------------- status -------------------------------- */
  success: '#8FD9B6', // 10.2 bg · 8.1 surface; dark text on it 10.2
  successSoft: '#1E3329',
  /** Warm sand. Also the check-in chart colour, so it never shares coral. */
  warning: '#F0C08A', // 10.1 bg · 8.0 surface
  warningSoft: '#3B3325',
  /** Mistake rings, error edges and icons. Not for text — see dangerText. */
  danger: '#FF9B94',
  dangerSoft: '#3A2523',
  /** Error text: 9.3 on dangerSoft, 7.6 even on raised. */
  dangerText: '#FFC2BC',

  disabled: '#6B635C',
} as const;

export type ColorName = keyof typeof colors;

/** 8pt scale. Generous by design — dense layouts are hard to target accurately. */
export const space = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  /** Side gutter on phones. */
  gutter: 16,
} as const;

/**
 * Atkinson Hyperlegible Next, built by the Braille Institute for low-vision
 * readers. Loaded in the root layout. Only two weights exist on purpose: thin
 * weights lose legibility first, and faster on a dark background.
 *
 * Each weight is its own family because Android does not pick a weight from
 * `fontWeight` for a custom font — it silently falls back to the system face.
 */
export const fonts = {
  regular: 'AtkinsonHyperlegibleNext_400Regular',
  semibold: 'AtkinsonHyperlegibleNext_600SemiBold',
} as const;

/** Body starts at 20 — the usual 14–16 is unreadable for much of this audience. */
export const type = {
  display: { fontSize: 34, lineHeight: 42, fontWeight: '600' },
  title: { fontSize: 28, lineHeight: 36, fontWeight: '600' },
  heading: { fontSize: 22, lineHeight: 30, fontWeight: '600' },
  body: { fontSize: 20, lineHeight: 30, fontWeight: '400' },
  label: { fontSize: 18, lineHeight: 26, fontWeight: '600' },
  caption: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  /** Headline numbers: a score, a streak. */
  numeral: { fontSize: 56, lineHeight: 64, fontWeight: '600' },
} as const;

/** 24 cards · 16 fields, tiles, answers · pill for buttons. */
export const radius = { sm: 8, md: 16, lg: 24, pill: 999 } as const;

/**
 * 56 rather than the conventional 44. Tremor and reduced fine motor control
 * make small targets a real failure point for this group.
 */
export const TOUCH_MIN = 56;
/** Primary actions and check-in answers. */
export const TOUCH_LARGE = 64;

export type TypeVariant = keyof typeof type;
