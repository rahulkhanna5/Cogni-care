import { colors } from '@/theme/tokens';

/**
 * Chart colours — dark theme.
 *
 * Still one hue in two shades rather than two hues. The dashboard's only
 * two-series chart is a before/after dumbbell, which the form guidance puts
 * at "1 hue, 2 shades"; differing by lightness rather than hue sidesteps
 * colour-vision separation entirely.
 *
 * On a dark background the earlier value is the DIMMER of the two, so the
 * current value reads as the brighter, more prominent mark. A two-hue
 * alternative was checked with the palette validator on the previous light
 * theme and failed badly (deltaE 5.8 in normal vision against a floor of 15);
 * do not reintroduce a second hue without re-running that check on this
 * background.
 *
 * Both shades are directly labelled wherever they appear, so colour never
 * carries meaning alone.
 */
export const chart = {
  /** Current value — brand primary. 8.0:1 on bg. */
  now: colors.accent,
  /** Earlier value. 5.8:1 on bg, well clear of the 3:1 mark floor. */
  before: '#C08A84',
  /** Track and axis furniture. Deliberately recessive. */
  track: '#3D3830',
  axis: colors.textMuted,
  /**
   * Ring drawn around overlapping marks so two dots stay separable when a
   * score has not moved. Must match whatever sits behind the chart, which on
   * this theme is the card surface, not white.
   */
  ring: colors.surface,
} as const;

/** Mark geometry, kept consistent across every chart. */
export const mark = {
  lineWidth: 2,
  dot: 9,
  trackHeight: 10,
  radius: 5,
} as const;
