export type BlinkLevel = {
  /** grid is grid x grid cells */
  grid: number;
  /** how many dots light up */
  length: number;
  /** how long each dot stays lit */
  flashMs: number;
  /** dark gap between dots — without it, two adjacent flashes blur together */
  gapMs: number;
  /** how many times the player may ask to see it again */
  replays: number;
};

/**
 * Follows the progression in the source deck: grid 3x3 → 6x6, length 3 → 10,
 * flash 800ms → 300ms. Difficulty moves one axis at a time — changing grid
 * size and sequence length together makes a level jump feel like a wall.
 */
export const BLINK_LEVELS: BlinkLevel[] = [
  { grid: 3, length: 3, flashMs: 800, gapMs: 300, replays: 1 },
  { grid: 3, length: 4, flashMs: 800, gapMs: 300, replays: 1 },
  { grid: 3, length: 4, flashMs: 700, gapMs: 280, replays: 1 },
  { grid: 3, length: 5, flashMs: 700, gapMs: 280, replays: 1 },
  { grid: 4, length: 5, flashMs: 650, gapMs: 260, replays: 1 },
  { grid: 4, length: 6, flashMs: 600, gapMs: 250, replays: 1 },
  { grid: 4, length: 6, flashMs: 550, gapMs: 240, replays: 0 },
  { grid: 4, length: 7, flashMs: 500, gapMs: 230, replays: 0 },
  { grid: 5, length: 7, flashMs: 500, gapMs: 220, replays: 0 },
  { grid: 5, length: 8, flashMs: 450, gapMs: 210, replays: 0 },
  { grid: 5, length: 8, flashMs: 400, gapMs: 200, replays: 0 },
  { grid: 5, length: 9, flashMs: 400, gapMs: 190, replays: 0 },
  { grid: 6, length: 9, flashMs: 350, gapMs: 180, replays: 0 },
  { grid: 6, length: 10, flashMs: 350, gapMs: 170, replays: 0 },
  { grid: 6, length: 10, flashMs: 300, gapMs: 160, replays: 0 },
];

export const BLINK_MAX_LEVEL = BLINK_LEVELS.length;

export const blinkLevel = (level: number): BlinkLevel =>
  BLINK_LEVELS[Math.min(Math.max(level, 1), BLINK_MAX_LEVEL) - 1];

export const describeBlinkLevel = (level: number): string => {
  const s = blinkLevel(level);
  return `${s.grid} by ${s.grid} grid, ${s.length} lights to remember`;
};
