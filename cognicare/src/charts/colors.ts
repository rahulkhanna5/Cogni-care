/**
 * Chart colours.
 *
 * One hue in two shades, not two hues. The dashboard's only two-series chart
 * is a before/after dumbbell, which the form guidance puts at "1 hue, 2
 * shades" — and that sidesteps colour-vision separation entirely, because
 * the pair differs in lightness rather than hue.
 *
 * A two-hue attempt was checked with the palette validator first and failed:
 * the brand teal against a neutral grey came out at ΔE 5.8 in NORMAL vision,
 * well under the floor of 15. Teal against the brand amber was 13.9, still
 * under. Do not reintroduce a second hue without re-running that validator.
 *
 * Both shades are also directly labelled wherever they appear, so colour is
 * never the only thing carrying meaning.
 */
export const chart = {
  /** Current value. 7.1:1 on white. */
  now: '#246257',
  /** Earlier value for comparison. 3.1:1 on white — clears the mark floor. */
  before: '#5E9D8D',
  /** Grid, tracks, and axis furniture. Deliberately recessive. */
  track: '#E2E5E1',
  axis: '#4A5760',
} as const;

/** Mark geometry, kept consistent across every chart. */
export const mark = {
  lineWidth: 2,
  dot: 9,
  trackHeight: 10,
  radius: 5,
} as const;
