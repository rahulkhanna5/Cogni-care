export type CurrentLevel = {
  /** fish to tap — every fish counts, whichever way it swims */
  targetCount: number;
  /** leaves, drops, weed and shells drifting down — never tap */
  distractorCount: number;
  /** how many of the fish come down from the top instead of up from the bottom */
  fromTop: number;
  /** Sharks. Tapping one is an inhibition failure, not a miss. */
  forbiddenCount: number;
  travelMs: number;
  durationMs: number;
};

/**
 * Deck progression: slow and high-contrast early, faster with more distractors
 * later, and a predator from the mid levels that must NOT be tapped.
 * The predator is what turns this from pure speed into response inhibition.
 * Fish come from both ends: from the top, 2 of them at first, up to 7. The
 * total of fish is unchanged, so the board is no more crowded — it is harder
 * because they no longer all arrive from the same side.
 */
export const CURRENT_LEVELS: CurrentLevel[] = [
  { targetCount: 6, distractorCount: 6, fromTop: 2, forbiddenCount: 0, travelMs: 7000, durationMs: 24000 },
  { targetCount: 7, distractorCount: 8, fromTop: 2, forbiddenCount: 0, travelMs: 6500, durationMs: 24000 },
  { targetCount: 8, distractorCount: 10, fromTop: 3, forbiddenCount: 0, travelMs: 6000, durationMs: 26000 },
  { targetCount: 8, distractorCount: 12, fromTop: 3, forbiddenCount: 0, travelMs: 5500, durationMs: 26000 },
  { targetCount: 9, distractorCount: 14, fromTop: 4, forbiddenCount: 0, travelMs: 5000, durationMs: 28000 },
  { targetCount: 9, distractorCount: 16, fromTop: 4, forbiddenCount: 1, travelMs: 5000, durationMs: 28000 },
  { targetCount: 10, distractorCount: 18, fromTop: 5, forbiddenCount: 1, travelMs: 4500, durationMs: 30000 },
  { targetCount: 10, distractorCount: 18, fromTop: 5, forbiddenCount: 2, travelMs: 4500, durationMs: 30000 },
  { targetCount: 11, distractorCount: 20, fromTop: 5, forbiddenCount: 2, travelMs: 4000, durationMs: 30000 },
  { targetCount: 11, distractorCount: 22, fromTop: 6, forbiddenCount: 3, travelMs: 4000, durationMs: 32000 },
  { targetCount: 12, distractorCount: 24, fromTop: 6, forbiddenCount: 3, travelMs: 3600, durationMs: 32000 },
  { targetCount: 12, distractorCount: 26, fromTop: 6, forbiddenCount: 4, travelMs: 3400, durationMs: 32000 },
  { targetCount: 13, distractorCount: 28, fromTop: 7, forbiddenCount: 4, travelMs: 3200, durationMs: 34000 },
  { targetCount: 13, distractorCount: 30, fromTop: 7, forbiddenCount: 5, travelMs: 3000, durationMs: 34000 },
  { targetCount: 14, distractorCount: 32, fromTop: 7, forbiddenCount: 5, travelMs: 2800, durationMs: 34000 },
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

/** Every fish is one to tap, from either end; debris is not. */
export const FISH = [
  { label: 'Fish', art: 'fish' as const },
  { label: 'Fish', art: 'fish-orange' as const },
  { label: 'Fish', art: 'puffer' as const },
];

export const DRIFT = [
  { label: 'Leaf', art: 'leaf' as const },
  { label: 'Leaf', art: 'leaf-autumn' as const },
  { label: 'Drop', art: 'drop' as const },
  { label: 'Weed', art: 'weed' as const },
  { label: 'Shell', art: 'shell' as const },
];

export const PREDATORS = [{ label: 'Shark', art: 'shark' as const }];
