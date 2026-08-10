export type MarketLevel = {
  /** how many items on the shopping list */
  listSize: number;
  /** how long the list is shown before it disappears */
  viewMs: number;
  /** distractors per target */
  distractorRatio: number;
  /** how long an item takes to cross the board */
  travelMs: number;
  durationMs: number;
};

/**
 * Deck progression: 3–7 items, viewing time 4s down to 2s, distractors at
 * 2–3x the targets. List length and viewing time are moved on alternate
 * levels so a promotion never changes both at once.
 */
export const MARKET_LEVELS: MarketLevel[] = [
  { listSize: 3, viewMs: 4000, distractorRatio: 2, travelMs: 7000, durationMs: 24000 },
  { listSize: 4, viewMs: 4000, distractorRatio: 2, travelMs: 7000, durationMs: 24000 },
  { listSize: 4, viewMs: 3500, distractorRatio: 2, travelMs: 6500, durationMs: 24000 },
  { listSize: 5, viewMs: 3500, distractorRatio: 2, travelMs: 6000, durationMs: 26000 },
  { listSize: 5, viewMs: 3000, distractorRatio: 2.5, travelMs: 6000, durationMs: 26000 },
  { listSize: 5, viewMs: 3000, distractorRatio: 2.5, travelMs: 5500, durationMs: 26000 },
  { listSize: 6, viewMs: 3000, distractorRatio: 2.5, travelMs: 5500, durationMs: 28000 },
  { listSize: 6, viewMs: 2500, distractorRatio: 2.5, travelMs: 5000, durationMs: 28000 },
  { listSize: 6, viewMs: 2500, distractorRatio: 3, travelMs: 5000, durationMs: 28000 },
  { listSize: 7, viewMs: 2500, distractorRatio: 3, travelMs: 4500, durationMs: 30000 },
  { listSize: 7, viewMs: 2200, distractorRatio: 3, travelMs: 4500, durationMs: 30000 },
  { listSize: 7, viewMs: 2200, distractorRatio: 3, travelMs: 4000, durationMs: 30000 },
  { listSize: 7, viewMs: 2000, distractorRatio: 3, travelMs: 4000, durationMs: 30000 },
  { listSize: 7, viewMs: 2000, distractorRatio: 3, travelMs: 3500, durationMs: 30000 },
  { listSize: 7, viewMs: 2000, distractorRatio: 3, travelMs: 3000, durationMs: 30000 },
];

export const MARKET_MAX_LEVEL = MARKET_LEVELS.length;

export const marketLevel = (level: number): MarketLevel =>
  MARKET_LEVELS[Math.min(Math.max(level, 1), MARKET_MAX_LEVEL) - 1];

export const describeMarketLevel = (level: number): string => {
  const s = marketLevel(level);
  return `${s.listSize} items to remember, shown for ${(s.viewMs / 1000).toFixed(1)} seconds`;
};

/** Everyday groceries. Emoji plus the word — the word carries it if the
 *  emoji renders differently across Android versions. */
export const GROCERIES = [
  { label: 'Bread', emoji: '🍞' },
  { label: 'Milk', emoji: '🥛' },
  { label: 'Eggs', emoji: '🥚' },
  { label: 'Banana', emoji: '🍌' },
  { label: 'Apple', emoji: '🍎' },
  { label: 'Cheese', emoji: '🧀' },
  { label: 'Rice', emoji: '🍚' },
  { label: 'Tomato', emoji: '🍅' },
  { label: 'Carrot', emoji: '🥕' },
  { label: 'Fish', emoji: '🐟' },
  { label: 'Tea', emoji: '🍵' },
  { label: 'Honey', emoji: '🍯' },
  { label: 'Orange', emoji: '🍊' },
  { label: 'Potato', emoji: '🥔' },
  { label: 'Onion', emoji: '🧅' },
  { label: 'Butter', emoji: '🧈' },
  { label: 'Grapes', emoji: '🍇' },
  { label: 'Corn', emoji: '🌽' },
];
