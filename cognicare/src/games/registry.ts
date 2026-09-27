import type { Domain } from '@/db/types';
import { BLINK_MAX_LEVEL } from './blink-trail/levels';
import { DAILY_MAX_LEVEL } from './daily-order/levels';
import { DUAL_MAX_LEVEL } from './dual-task-flow/levels';
import { MEADOW_MAX_LEVEL } from './emotion-meadow/levels';
import { MARKET_MAX_LEVEL } from './market-rush/levels';
import { PATH_MAX_LEVEL } from './path-finder/levels';
import { FOREST_MAX_LEVEL } from './sound-forest/levels';
import { CURRENT_MAX_LEVEL } from './speedy-current/levels';

export type GameId =
  | 'market-rush'
  | 'speedy-current'
  | 'blink-trail'
  | 'emotion-meadow'
  | 'sound-forest'
  | 'path-finder'
  | 'dual-task-flow'
  | 'daily-order';

export type GameMeta = {
  id: GameId;
  title: string;
  /** Shown on the card. Plain words, no jargon — the user is not a clinician. */
  blurb: string;
  /** Questionnaire domains this game plausibly touches. */
  domains: Domain[];
  /** Extra cognitive targets the questionnaire does not measure. */
  alsoTrains?: string[];
  needsHeadphones?: boolean;
  /** Set true once the game itself is implemented. */
  ready: boolean;
  /** Levels differ per game (Daily Order has 10), so progress is shown against this. */
  maxLevel: number;
};

export const GAMES: GameMeta[] = [
  {
    id: 'blink-trail',
    title: 'Blink Trail',
    blurb: 'Watch the lights, then tap them back in the same order.',
    domains: ['stm', 'attention'],
    ready: true,
    maxLevel: BLINK_MAX_LEVEL,
  },
  {
    id: 'market-rush',
    title: 'Market Rush',
    blurb: 'Remember the shopping list, then pick those items out of the crowd.',
    domains: ['stm', 'speed', 'attention'],
    ready: true,
    maxLevel: MARKET_MAX_LEVEL,
  },
  {
    id: 'speedy-current',
    title: 'Speedy Current',
    blurb: 'Tap only the fish swimming against the current.',
    domains: ['speed', 'attention'],
    ready: true,
    maxLevel: CURRENT_MAX_LEVEL,
  },
  {
    id: 'sound-forest',
    title: 'Sound Forest',
    blurb: 'Listen to the forest and find where each sound came from.',
    domains: ['attention', 'stm'],
    needsHeadphones: true,
    ready: true,
    maxLevel: FOREST_MAX_LEVEL,
  },
  {
    id: 'path-finder',
    title: 'Path Finder',
    blurb: 'Plan the shortest safe route across town.',
    domains: ['adl'],
    alsoTrains: ['Planning', 'Problem solving'],
    ready: true,
    maxLevel: PATH_MAX_LEVEL,
  },
  {
    id: 'emotion-meadow',
    title: 'Emotion Meadow',
    blurb: 'Find the face showing the feeling you are asked for.',
    domains: [],
    alsoTrains: ['Social cognition', 'Emotion recognition'],
    ready: true,
    maxLevel: MEADOW_MAX_LEVEL,
  },
  {
    id: 'daily-order',
    title: 'Daily Order',
    blurb: 'Put the steps of an everyday task into the right order.',
    domains: ['adl', 'ltm'],
    alsoTrains: ['Sequencing', 'Planning'],
    ready: true,
    maxLevel: DAILY_MAX_LEVEL,
  },
  {
    id: 'dual-task-flow',
    title: 'Dual Task Flow',
    blurb: 'Two things at once — watch and listen at the same time.',
    domains: ['attention', 'speed'],
    alsoTrains: ['Task switching'],
    ready: true,
    maxLevel: DUAL_MAX_LEVEL,
  },
];

export const getGame = (id: string) => GAMES.find((g) => g.id === id);
