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

/** Everyday groceries. An illustration plus the word — the word is always shown. */
export const GROCERIES = [
  { label: 'Bread', art: 'bread' as const },
  { label: 'Milk', art: 'milk' as const },
  { label: 'Eggs', art: 'eggs' as const },
  { label: 'Banana', art: 'banana' as const },
  { label: 'Apple', art: 'apple' as const },
  { label: 'Cheese', art: 'cheese' as const },
  { label: 'Rice', art: 'rice' as const },
  { label: 'Tomato', art: 'tomato' as const },
  { label: 'Carrot', art: 'carrot' as const },
  { label: 'Fish', art: 'fish' as const },
  { label: 'Tea', art: 'tea' as const },
  { label: 'Honey', art: 'honey' as const },
  { label: 'Orange', art: 'orange' as const },
  { label: 'Potato', art: 'potato' as const },
  { label: 'Onion', art: 'onion' as const },
  { label: 'Butter', art: 'butter' as const },
  { label: 'Grapes', art: 'grapes' as const },
  { label: 'Corn', art: 'corn' as const },
  // Household and packaged goods. They can be on the list too, so "never pick
  // anything that isn't food" is not a shortcut around remembering.
  { label: 'Soap', art: 'soap' as const },
  { label: 'Shampoo', art: 'shampoo' as const },
  { label: 'Cereal', art: 'cereal' as const },
  { label: 'Toothpaste', art: 'toothpaste' as const },
  { label: 'Juice', art: 'juice' as const },
  { label: 'Biscuits', art: 'biscuits' as const },
  { label: 'Detergent', art: 'detergent' as const },
];
