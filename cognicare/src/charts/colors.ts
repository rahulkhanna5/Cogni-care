import { colors } from '@/theme/tokens';

/**
 * Chart colours.
 *
 * The two panels never share a colour: game charts are coral, check-in charts
 * are warm sand. The directions are opposite — higher is better in the games,
 * lower is better in the check-in — and a shared colour would invite reading
 * one as a continuation of the other.
 *
 * Within the check-in dumbbell, previous vs latest differ by SHAPE (hollow
 * ring vs solid dot), not by shade, so colour-vision differences cannot merge
 * them. Every two-series chart also carries a legend.
 */
export const chart = {
  /** Game results. 6.3:1 as a mark on a card — graphics need 3:1. */
  game: colors.accent,
  /** Check-in results. 8.0:1 on a card. */
  checkin: colors.warning,
  /** Outline of an empty meter segment or bar track. */
  outline: colors.edge,
  /** Axis rules and average lines. */
  axis: colors.textMuted,
  /** Hairline under a dumbbell. */
  track: colors.divider,
} as const;

/** Mark geometry, kept consistent across every chart. */
export const mark = {
  lineWidth: 2.5,
  dot: 8,
  trackHeight: 12,
} as const;
