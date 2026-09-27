/**
 * Every illustration in the app. Kept free of React so the pure game engines
 * can refer to art by name without importing a renderer.
 */
export const ART_NAMES = [
  // groceries (Market Rush)
  'bread',
  'milk',
  'eggs',
  'banana',
  'apple',
  'cheese',
  'rice',
  'tomato',
  'carrot',
  'fish',
  'tea',
  'honey',
  'orange',
  'potato',
  'onion',
  'butter',
  'grapes',
  'corn',
  // household and packaged goods (Market Rush)
  'soap',
  'shampoo',
  'cereal',
  'toothpaste',
  'juice',
  'biscuits',
  'detergent',
  // river (Speedy Current)
  'fish-orange',
  'puffer',
  'shark',
  'leaf',
  'leaf-autumn',
  'drop',
  'weed',
  'shell',
  // forest (Sound Forest)
  'owl',
  'crow',
  'frog',
  'cricket',
  'duck',
] as const;

export type ArtName = (typeof ART_NAMES)[number];
