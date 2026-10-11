import type Ionicons from '@expo/vector-icons/Ionicons';

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
 *
 * EVERY routine has SEVEN steps and THREE distractors. The top level asks for
 * seven steps, and a level can only vary its task if several routines are long
 * enough for it: with one seven-step routine, levels 9 and 10 showed grocery
 * shopping every single time. A level only ever uses the first N steps, so the
 * early steps are what a beginner meets — never reorder them casually.
 *
 * A step's picture is found by its exact words (scenes.tsx), so a new step
 * needs a scene in art/, and scenes.test.tsx fails until it has one.
 */

export type DailyTask = {
  id: string;
  title: string;
  /** An outline icon from the app's icon set, shown beside the title. */
  icon: keyof typeof Ionicons.glyphMap;
  /** In the correct order. */
  steps: string[];
  /** Plausible but wrong steps, used as distractors at higher levels. */
  distractors: string[];
};

export const TASKS: DailyTask[] = [
  {
    id: 'tea',
    title: 'Making a cup of tea',
    icon: 'cafe-outline',
    steps: [
      'Fill the kettle with water',
      'Switch the kettle on',
      'Put a tea bag in the cup',
      'Pour the hot water into the cup',
      'Let it brew, then remove the tea bag',
      'Add milk or sugar if you like',
      'Carry the cup to your chair',
    ],
    distractors: ['Wash the car', 'Put the cup in the fridge', 'Put the tea bag in the kettle'],
  },
  {
    id: 'medicine',
    title: 'Taking your morning medicine',
    icon: 'medkit-outline',
    steps: [
      'Check the label for the right medicine',
      'Check how many tablets you need',
      'Pour a glass of water',
      'Take the tablets with the water',
      'Tick it off on your chart',
      'Close the bottle tightly',
      'Put the bottle back in the cupboard',
    ],
    distractors: ['Take a second dose to be safe', 'Skip the water', 'Leave the bottle open on the table'],
  },
  {
    id: 'shopping',
    title: 'Going to buy groceries',
    icon: 'cart-outline',
    steps: [
      'Check what you have run out of',
      'Write a shopping list',
      'Take your bag and purse',
      'Walk to the shop',
      'Pick the items on your list',
      'Pay at the counter',
      'Carry the shopping home',
    ],
    distractors: ['Pay before choosing the items', 'Leave your purse at home', 'Leave the shopping at the shop'],
  },
  {
    id: 'letter',
    title: 'Posting a letter',
    icon: 'mail-outline',
    steps: [
      'Write the letter',
      'Fold it and put it in an envelope',
      'Write the address on the front',
      'Stick a stamp on it',
      'Take it to the post box',
      'Drop it in the post box',
      'Check when the post is collected',
    ],
    distractors: ['Post it without an address', 'Open the envelope again', 'Put the letter in the bin instead'],
  },
  {
    id: 'bill',
    title: 'Paying an electricity bill',
    icon: 'receipt-outline',
    steps: [
      'Find the bill and check the amount',
      'Check the last date to pay',
      'Open your bank app or take cash',
      'Make the payment',
      'Keep the receipt',
      'Mark the next due date on your calendar',
      'Write the amount in your account book',
    ],
    distractors: ['Throw the bill away first', 'Pay twice to be safe', 'Put it off until next month'],
  },
  {
    id: 'meal',
    title: 'Cooking rice',
    icon: 'restaurant-outline',
    steps: [
      'Measure the rice',
      'Rinse it under water',
      'Put it in the pot with water',
      'Bring it to a boil',
      'Turn the heat down and cover it',
      'Turn off the heat and let it rest',
      'Fluff the rice with a fork',
    ],
    distractors: ['Serve it before cooking', 'Add petrol to the pot', 'Leave the pot on all night'],
  },
  {
    id: 'washing',
    title: 'Washing clothes',
    icon: 'shirt-outline',
    steps: [
      'Sort the dirty clothes',
      'Put them in the machine',
      'Add the detergent',
      'Start the machine',
      'Take the clothes out of the machine',
      'Hang the clothes out to dry',
      'Fold the dry clothes',
    ],
    distractors: [
      'Dry them before washing',
      'Add detergent to the dryer',
      'Leave the wet clothes in the machine for a week',
    ],
  },
  {
    id: 'appointment',
    title: 'Going to a doctor’s appointment',
    icon: 'calendar-outline',
    steps: [
      'Check the date and time',
      'Put your medicines list in your bag',
      'Leave early enough to arrive on time',
      'Tell the desk you have arrived',
      'Wait until you are called',
      'Go in when the doctor calls you',
      'Ask when to come back',
    ],
    distractors: ['Arrive the day after', 'Leave without telling the desk', 'Forget your medicines list at home'],
  },
];

export const getTask = (id: string) => TASKS.find((t) => t.id === id);
