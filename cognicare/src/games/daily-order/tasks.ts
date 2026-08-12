/**
 * Everyday routines, each written as its correct sequence of steps.
 *
 * This game fills the gap the two source documents left between them: the
 * questionnaire scores Long-Term Memory and Activities of Daily Living, but
 * none of the seven deck games trained either. Recalling the order of a
 * familiar routine is stored knowledge (long-term, semantic) applied to a
 * daily-living task, so one exercise covers both.
 *
 * Steps must read as unambiguous to someone who has done the task a thousand
 * times. Where two steps could reasonably swap, the routine is not usable.
 */

export type DailyTask = {
  id: string;
  title: string;
  emoji: string;
  /** In the correct order. */
  steps: string[];
  /** Plausible but wrong steps, used as distractors at higher levels. */
  distractors: string[];
};

export const TASKS: DailyTask[] = [
  {
    id: 'tea',
    title: 'Making a cup of tea',
    emoji: '☕',
    steps: [
      'Fill the kettle with water',
      'Switch the kettle on',
      'Put a tea bag in the cup',
      'Pour the hot water into the cup',
      'Let it brew, then remove the tea bag',
      'Add milk or sugar if you like',
    ],
    distractors: ['Wash the car', 'Put the cup in the fridge'],
  },
  {
    id: 'medicine',
    title: 'Taking your morning medicine',
    emoji: '💊',
    steps: [
      'Check the label for the right medicine',
      'Check how many tablets you need',
      'Pour a glass of water',
      'Take the tablets with the water',
      'Tick it off on your chart',
    ],
    distractors: ['Take a second dose to be safe', 'Skip the water'],
  },
  {
    id: 'shopping',
    title: 'Going to buy groceries',
    emoji: '🛒',
    steps: [
      'Check what you have run out of',
      'Write a shopping list',
      'Take your bag and purse',
      'Walk to the shop',
      'Pick the items on your list',
      'Pay at the counter',
      'Carry the shopping home',
    ],
    distractors: ['Pay before choosing the items', 'Leave your purse at home'],
  },
  {
    id: 'letter',
    title: 'Posting a letter',
    emoji: '✉️',
    steps: [
      'Write the letter',
      'Fold it and put it in an envelope',
      'Write the address on the front',
      'Stick a stamp on it',
      'Take it to the post box',
    ],
    distractors: ['Post it without an address', 'Open the envelope again'],
  },
  {
    id: 'bill',
    title: 'Paying an electricity bill',
    emoji: '🧾',
    steps: [
      'Find the bill and check the amount',
      'Check the last date to pay',
      'Open your bank app or take cash',
      'Make the payment',
      'Keep the receipt',
    ],
    distractors: ['Throw the bill away first', 'Pay twice to be safe'],
  },
  {
    id: 'meal',
    title: 'Cooking rice',
    emoji: '🍚',
    steps: [
      'Measure the rice',
      'Rinse it under water',
      'Put it in the pot with water',
      'Bring it to a boil',
      'Turn the heat down and cover it',
      'Turn off the heat and let it rest',
    ],
    distractors: ['Serve it before cooking', 'Add petrol to the pot'],
  },
  {
    id: 'washing',
    title: 'Washing clothes',
    emoji: '👕',
    steps: [
      'Sort the dirty clothes',
      'Put them in the machine',
      'Add the detergent',
      'Start the machine',
      'Hang the clothes out to dry',
    ],
    distractors: ['Dry them before washing', 'Add detergent to the dryer'],
  },
  {
    id: 'appointment',
    title: 'Going to a doctor’s appointment',
    emoji: '🏥',
    steps: [
      'Check the date and time',
      'Put your medicines list in your bag',
      'Leave early enough to arrive on time',
      'Tell the desk you have arrived',
      'Wait until you are called',
    ],
    distractors: ['Arrive the day after', 'Leave without telling the desk'],
  },
];

export const getTask = (id: string) => TASKS.find((t) => t.id === id);
