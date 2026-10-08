import { colors } from '@/theme/tokens';

/**
 * The city's own colours — scenery, from the game brief. Nothing here is
 * information on its own: busy roads carry traffic and a label, closed roads
 * a barrier, places an icon and a word. The few colours that must be read
 * (labels, the route) are measured in palette.test.ts.
 */
export const CITY = {
  grass: '#A8C47A',
  grassDark: '#93B266',
  lawn: '#9CCB6E',
  road: '#555A5C',
  /** Pavement either side of a road. */
  kerb: '#DDD6C6',
  marking: '#F8F3D4',
  path: '#E9DDBE',
  pathEdge: '#CDBE97',
  water: '#78B6D2',
  waterDeep: '#5A9DBD',
  ripple: '#B9DCEB',
  bank: '#C9B98F',
  bridge: '#C7BFB3',
  rail: '#8A8076',
  walls: ['#F1E3C8', '#E8D5B5', '#AFC5C7', '#EFD0B4'],
  roofs: ['#C97B62', '#B5654F', '#8F6F5A', '#D9A86C'],
  /** Shadowed east walls are drawn as the wall colour under this. */
  shade: 'rgba(36,50,56,0.22)',
  window: '#5E7F8A',
  door: '#7A5A3C',
  trunk: '#7A5A3C',
  leaves: ['#5E9A4B', '#4E8A43', '#73AA55'],
  shadow: 'rgba(36,50,56,0.18)',
  cars: ['#C94C4C', '#3F6FB5', '#E5A93D', '#F4F1E8', '#4F8A5B'],
  works: '#E5A93D',
  worksStripe: '#FFFFFF',
  danger: '#C94C4C',
  clinicCross: '#C94C4C',
  pharmacyCross: '#2E8B57',
  fountain: '#E9E4D8',
  /** Map labels: dark text on a white pill — the app's own text colour. */
  label: '#FFFFFF',
  labelInk: colors.text,
  labelEdge: colors.edge,
  /** The walked route: blue core on a white halo, so it reads on asphalt and on grass. */
  route: colors.accentBright,
  routeHalo: '#FFFFFF',
  /** The best route, after checking: dashed, the brief's teal. */
  best: '#167C80',
  /** Roads you can take next. */
  glow: '#FFE27A',
} as const;
