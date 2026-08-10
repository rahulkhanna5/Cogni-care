export type CurrentLevel = {
  targetCount: number;
  distractorCount: number;
  /** Sharks. Tapping one is an inhibition failure, not a miss. */
  forbiddenCount: number;
  travelMs: number;
  durationMs: number;
};

/**
 * Deck progression: slow and high-contrast early, faster with more distractors
 * later, and a predator from the mid levels that must NOT be tapped.
 * The predator is what turns this from pure speed into response inhibition.
 */
export const CURRENT_LEVELS: CurrentLevel[] = [
  { targetCount: 6, distractorCount: 6, forbiddenCount: 0, travelMs: 7000, durationMs: 24000 },
  { targetCount: 7, distractorCount: 8, forbiddenCount: 0, travelMs: 6500, durationMs: 24000 },
  { targetCount: 8, distractorCount: 10, forbiddenCount: 0, travelMs: 6000, durationMs: 26000 },
  { targetCount: 8, distractorCount: 12, forbiddenCount: 0, travelMs: 5500, durationMs: 26000 },
  { targetCount: 9, distractorCount: 14, forbiddenCount: 0, travelMs: 5000, durationMs: 28000 },
  { targetCount: 9, distractorCount: 16, forbiddenCount: 1, travelMs: 5000, durationMs: 28000 },
  { targetCount: 10, distractorCount: 18, forbiddenCount: 1, travelMs: 4500, durationMs: 30000 },
  { targetCount: 10, distractorCount: 18, forbiddenCount: 2, travelMs: 4500, durationMs: 30000 },
  { targetCount: 11, distractorCount: 20, forbiddenCount: 2, travelMs: 4000, durationMs: 30000 },
  { targetCount: 11, distractorCount: 22, forbiddenCount: 3, travelMs: 4000, durationMs: 32000 },
  { targetCount: 12, distractorCount: 24, forbiddenCount: 3, travelMs: 3600, durationMs: 32000 },
  { targetCount: 12, distractorCount: 26, forbiddenCount: 4, travelMs: 3400, durationMs: 32000 },
  { targetCount: 13, distractorCount: 28, forbiddenCount: 4, travelMs: 3200, durationMs: 34000 },
  { targetCount: 13, distractorCount: 30, forbiddenCount: 5, travelMs: 3000, durationMs: 34000 },
  { targetCount: 14, distractorCount: 32, forbiddenCount: 5, travelMs: 2800, durationMs: 34000 },
];

export const CURRENT_MAX_LEVEL = CURRENT_LEVELS.length;

export const currentLevel = (level: number): CurrentLevel =>
  CURRENT_LEVELS[Math.min(Math.max(level, 1), CURRENT_MAX_LEVEL) - 1];

export const describeCurrentLevel = (level: number): string => {
  const s = currentLevel(level);
  return s.forbiddenCount > 0
    ? `Faster water, and sharks to avoid`
    : `${s.targetCount} fish to catch`;
};

/** Fish swim up against the current; everything else drifts down with it. */
export const FISH = [
  { label: 'Fish', emoji: '🐟' },
  { label: 'Fish', emoji: '🐠' },
  { label: 'Fish', emoji: '🐡' },
];

export const DRIFT = [
  { label: 'Leaf', emoji: '🍃' },
  { label: 'Leaf', emoji: '🍂' },
  { label: 'Drop', emoji: '💧' },
  { label: 'Weed', emoji: '🌿' },
  { label: 'Shell', emoji: '🐚' },
];

export const PREDATORS = [{ label: 'Shark', emoji: '🦈' }];
