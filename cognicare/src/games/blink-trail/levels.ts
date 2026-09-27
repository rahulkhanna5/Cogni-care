export type BlinkLevel = {
  /** squares across */
  cols: number;
  /** squares down — one more than across, so the board uses a phone's height */
  rows: number;
  /** how many squares light up */
  length: number;
  /** how long each square stays lit */
  flashMs: number;
  /** dark gap between flashes — without it, two adjacent flashes blur together */
  gapMs: number;
  /** how many times the player may ask to see it again */
  replays: number;
};

/**
 * One more light at every level: 3 at level 1, 4 at level 2, and so on to 10.
 * Nothing else changes — the same 3×4 board, the same pace, one replay — so
 * each step up is exactly one more thing to remember, never two changes at
 * once, which is what makes a level jump feel like a wall.
 *
 * It stops at 10, the source deck's maximum. Spatial span in healthy older
 * adults is about five or six; much past ten, a sequence is a wall for
 * everyone, and a level nobody can pass only teaches the player to fail.
 */
export const BLINK_LEVELS: BlinkLevel[] = [3, 4, 5, 6, 7, 8, 9, 10].map((length) => ({
  cols: 3,
  rows: 4,
  length,
  flashMs: 800,
  gapMs: 300,
  replays: 1,
}));

export const BLINK_MAX_LEVEL = BLINK_LEVELS.length;

export const blinkLevel = (level: number): BlinkLevel =>
  BLINK_LEVELS[Math.min(Math.max(level, 1), BLINK_MAX_LEVEL) - 1];

export const describeBlinkLevel = (level: number): string => {
  const s = blinkLevel(level);
  return `${s.length} lights to remember, on a ${s.cols} by ${s.rows} grid`;
};
