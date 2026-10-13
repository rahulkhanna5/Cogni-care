/**
 * Design tokens — a calm light theme: blue on a very light page, white cards,
 * dark navy text.
 *
 * Brand colours supplied by the owner: primary blue #2563EB, teal #0F766E,
 * page #F8FAFC, cards #FFFFFF, text #172033, secondary text #475569, and
 * green #16A34A, amber #D97706, red #DC2626 for status. Every pair below was
 * measured before use (see tokens.test.ts, which fails the build if any drift).
 *
 * The rule is 7:1 (WCAG AAA) for ALL text, measured against the surface the
 * text actually sits on. The owner's colours are exact wherever they are
 * shapes — the logo, icons, ticks, chart lines, selection edges — and clear
 * 3:1 there. They are NOT enough for text or a white label on a fill: blue is
 * 5.2:1 on white, red 4.8, teal 5.5, green 3.3 and amber 3.2. Where text sits
 * on one of them it uses the nearest darker shade of the same hue instead
 * (`accent`, `successText`, `warningText`, `dangerText`), which reaches 7.4:1.
 * Edges of anything you can tap or type into are held to 3:1.
 */

const LIGHT = {
  /* ------------------------------- surfaces ------------------------------- */
  /** The page. */
  bg: '#F8FAFC',
  /** Cards and tiles. */
  surface: '#FFFFFF',
  /** Raised blocks inside a card, and the disabled button fill. */
  surfaceRaised: '#F5F8FB',
  /** Text field fill. */
  field: '#FFFFFF',
  tabBar: '#FFFFFF',
  /**
   * Behind a selected card, answer or placed step. Always paired with a 3px
   * blue edge and a check, never colour alone. Muted and coloured text on it
   * falls just under 7:1, so it yields to main text there (see contrast.ts).
   */
  selected: '#EFF6FF',
  /** A stronger blue tint for small shapes that hold an icon: avatars, the tab pill. */
  tint: '#DBEAFE',
  /** Light tile behind every illustration. */
  tile: '#F2E6DA',
  /** Dark ink for features drawn on a light tile or face, and ticks on green. */
  ink: '#172033',

  /* --------------------------------- text --------------------------------- */
  text: '#172033', // 15.6 bg · 16.3 surface
  textMuted: '#475569', // 7.2 bg · 7.6 surface · 7.1 raised
  /** White, for text and icons on a blue fill. 7.4:1 on `accent`. */
  textInverse: '#FFFFFF',
  /**
   * Placeholder examples only. 4.8:1 on a white field — below the 7:1 text
   * rule on purpose: a placeholder as dark as typed text reads as already
   * filled in. Labels always sit above fields, so no instruction lives here.
   */
  placeholder: '#64748B',

  /* --------------------------------- blue --------------------------------- */
  /** Buttons, links and blue text: 7.4:1 on a card, 7.0 on the page, 7.4 with white on it. */
  accent: '#1D4EBA',
  /** Blue text on a tinted surface: 9.3 raised · 9.0 selected. */
  accentOnCard: '#183E94',
  /** The owner's blue, exactly. Shapes only — logo, chart lines, selection edges (5.2:1). Never text. */
  accentBright: '#2563EB',
  /** The glow ring around a lit cell. Graphic only. */
  halo: '#93B4F5',

  /* --------------------------------- teal --------------------------------- */
  /** Check-in charts, so the two panels never share a colour. 5.5:1 as a mark on a card. */
  teal: '#0F766E',

  /* --------------------------------- lines -------------------------------- */
  /** Edges of inputs, tiles, chips: 4.6 bg · 4.8 surface · 4.5 raised. */
  edge: '#64748B',
  /** Decorative lines only (1.2:1). Never an input edge. */
  divider: '#E2E8F0',

  /* -------------------------------- status -------------------------------- */
  /** The owner's green, exactly: ticks and rings (3.3:1 as a mark). Not for text. */
  success: '#16A34A',
  successSoft: '#DCFCE7',
  /** Green text: 7.4:1 on a card. */
  successText: '#0D632D',
  /** The owner's amber, exactly: warning marks (3.2:1). Not for text. */
  warning: '#D97706',
  warningSoft: '#FEF3C7',
  warningText: '#824704',
  /** The owner's red, exactly: mistake rings, error edges and icons (4.8:1). Not for text. */
  danger: '#DC2626',
  dangerSoft: '#FEE2E2',
  /** Error text: 7.4:1 on a card. */
  dangerText: '#A71D1D',

  disabled: '#94A3B8',
};

export type ColorName = keyof typeof LIGHT;
export type Palette = Record<ColorName, string>;

/**
 * The dark theme. Same rules, measured the same way (tokens.test.ts runs every
 * contrast check on both): 7:1 for text on the surface it sits on, 3:1 for
 * marks and edges. On a dark page the owner's blue is too dim as a mark, so
 * shapes use a lighter blue, and a primary button is light blue with DARK text
 * (`textInverse`). Illustrations keep their light tile and dark ink in both
 * themes — they are pictures, not chrome.
 */
const DARK: Palette = {
  bg: '#0B1220',
  surface: '#141C2E',
  surfaceRaised: '#1B2538',
  field: '#141C2E',
  tabBar: '#141C2E',
  selected: '#1A2B4F',
  tint: '#1E3A6E',
  tile: LIGHT.tile,
  ink: LIGHT.ink,

  text: '#F1F5F9',
  textMuted: '#B6C2D2',
  textInverse: '#0B1220',
  placeholder: '#94A3B8',

  accent: '#93C5FD',
  accentOnCard: '#BFDBFE',
  accentBright: '#60A5FA',
  halo: '#3B5BA9',

  teal: '#2DD4BF',

  edge: '#8291A7',
  divider: '#263247',

  success: '#4ADE80',
  successSoft: '#0F2E1D',
  successText: '#86EFAC',
  warning: '#FBBF24',
  warningSoft: '#33260A',
  warningText: '#FCD34D',
  danger: '#F87171',
  dangerSoft: '#3A1414',
  dangerText: '#FCA5A5',

  disabled: '#475569',
};

export type ThemeMode = 'light' | 'dark';

/**
 * The live palette. One object, read at render time everywhere; switching the
 * theme rewrites its values and the root re-draws the app (see _layout.tsx).
 * Never copy a colour into a module-level constant — it would not follow.
 */
export const colors: Palette = { ...LIGHT };
let current: ThemeMode = 'light';
const listeners = new Set<() => void>();

export function applyTheme(mode: ThemeMode) {
  if (mode === current) return;
  Object.assign(colors, mode === 'dark' ? DARK : LIGHT);
  current = mode;
  listeners.forEach((l) => l());
}

export const themeMode = () => current;
/** For tables derived from the palette (contrast.ts) to rebuild themselves. */
export const onThemeChange = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
export const PALETTES = { light: LIGHT, dark: DARK } as const;

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
