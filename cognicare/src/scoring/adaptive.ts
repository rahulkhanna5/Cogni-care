/**
 * The one difficulty rule, shared by all seven games.
 *
 * Targets roughly 70-80% success: hard enough to train, easy enough to stay.
 * See ARCHITECTURE.md §5.
 */

export type Direction = 'up' | 'hold' | 'down';

export const LEVEL_UP_AT = 0.85;
export const LEVEL_DOWN_BELOW = 0.6;

export type LevelDecision = {
  level: number;
  direction: Direction;
};

export function decideNextLevel(params: {
  accuracy: number; // 0..1 across the whole session
  currentLevel: number;
  maxLevel: number;
  /** Direction of the previous session, persisted per player per game. */
  lastDirection: Direction | null;
}): LevelDecision {
  const { accuracy, currentLevel, maxLevel, lastDirection } = params;

  if (accuracy >= LEVEL_UP_AT) {
    return {
      level: Math.min(currentLevel + 1, maxLevel),
      direction: currentLevel >= maxLevel ? 'hold' : 'up',
    };
  }

  if (accuracy < LEVEL_DOWN_BELOW) {
    // Two demotions in a row reads as failing, and people quit. Hold instead.
    if (lastDirection === 'down') return { level: currentLevel, direction: 'hold' };
    return {
      level: Math.max(currentLevel - 1, 1),
      direction: currentLevel <= 1 ? 'hold' : 'down',
    };
  }

  return { level: currentLevel, direction: 'hold' };
}

/** Wording shown on the summary screen. Never says "failed" or "wrong". */
export function encourage(direction: Direction, accuracy: number): string {
  if (direction === 'up') return 'Well done — moving up a level.';
  if (direction === 'down') return 'Let’s take that one a little easier next time.';
  if (accuracy >= LEVEL_UP_AT) return 'Great work — you’re at the top level.';
  return 'Nice work. Same level next time.';
}
